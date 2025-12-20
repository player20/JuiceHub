/**
 * Billing Service
 *
 * Handles billing logic, automatic charging, and late fees
 * Coordinates between invoices and payments
 */

import { ILogger } from '@citrineos/base';
import { SequelizeRepository } from '@citrineos/data';
import { addDays, isBefore } from 'date-fns';
import {
  BillingConfig,
  DEFAULT_BILLING_CONFIG,
  Invoice,
  Payment,
} from './interfaces';
import { InvoiceService } from './InvoiceService';
import { PaymentService } from './PaymentService';

export class BillingService {
  private readonly logger: ILogger;
  private readonly repository: SequelizeRepository;
  private readonly config: BillingConfig;
  private readonly invoiceService: InvoiceService;
  private readonly paymentService: PaymentService;

  constructor(
    logger: ILogger,
    repository: SequelizeRepository,
    invoiceService: InvoiceService,
    paymentService: PaymentService,
    config: BillingConfig = DEFAULT_BILLING_CONFIG
  ) {
    this.logger = logger;
    this.repository = repository;
    this.config = config;
    this.invoiceService = invoiceService;
    this.paymentService = paymentService;
  }

  /**
   * Process billing for a user's transactions
   *
   * Creates invoice and optionally charges immediately
   *
   * @param userId User ID
   * @param transactionIds Transaction IDs to bill
   * @param autoCharge Whether to charge immediately
   * @returns Invoice and optional payment
   */
  async processBilling(
    userId: string,
    transactionIds: string[],
    autoCharge: boolean = this.config.autoChargeEnabled
  ): Promise<{
    invoice: Invoice;
    payment?: Payment | null;
  }> {
    try {
      this.logger.info(
        `Processing billing for user ${userId} with ${transactionIds.length} transactions`
      );

      // Create invoice
      const invoice = await this.invoiceService.createInvoice({
        userId,
        transactionIds,
        autoCharge,
      });

      // Auto-charge if enabled
      let payment: Payment | null = null;
      if (autoCharge && this.paymentService.isEnabled()) {
        payment = await this.chargeInvoice(invoice.id);
      }

      return { invoice, payment };
    } catch (error) {
      this.logger.error('Failed to process billing', error);
      throw error;
    }
  }

  /**
   * Charge an invoice using user's default payment method
   *
   * @param invoiceId Invoice ID
   * @returns Payment record
   */
  async chargeInvoice(invoiceId: string): Promise<Payment | null> {
    try {
      const invoice = await this.invoiceService.getInvoice(invoiceId);

      if (!invoice) {
        throw new Error('Invoice not found');
      }

      if (invoice.status === 'paid') {
        this.logger.warn(`Invoice ${invoiceId} is already paid`);
        return null;
      }

      if (invoice.status === 'cancelled') {
        throw new Error('Cannot charge cancelled invoice');
      }

      // Get user's default payment method
      const paymentMethods = await this.paymentService.getPaymentMethods(
        invoice.userId
      );
      const defaultMethod = paymentMethods.find((pm) => pm.isDefault);

      if (!defaultMethod) {
        throw new Error('No default payment method found for user');
      }

      // Create payment
      const payment = await this.paymentService.createPayment({
        userId: invoice.userId,
        invoiceId: invoice.id,
        amount: invoice.total,
        currency: invoice.currency,
        stripePaymentMethodId: defaultMethod.stripePaymentMethodId,
        description: `Payment for invoice ${invoice.invoiceNumber}`,
      });

      // Mark invoice as paid if payment succeeded
      if (payment && payment.status === 'succeeded') {
        await this.invoiceService.markAsPaid(invoiceId);
      }

      return payment;
    } catch (error) {
      this.logger.error(`Failed to charge invoice ${invoiceId}`, error);
      throw error;
    }
  }

  /**
   * Process overdue invoices
   *
   * Applies late fees and sends notifications
   * Should be run daily via cron job
   */
  async processOverdueInvoices(): Promise<{
    processed: number;
    lateFeesApplied: number;
  }> {
    try {
      this.logger.info('Processing overdue invoices...');

      const today = new Date();

      // Get all pending invoices past due date
      const overdueInvoices = await this.repository.readOnlyDbConnection.models.invoices.findAll({
        where: {
          status: 'pending',
          dueDate: { $lt: today },
        },
      });

      let lateFeesApplied = 0;

      for (const invoice of overdueInvoices) {
        try {
          // Apply late fee if enabled and not already applied
          if (this.config.lateFeesEnabled && !invoice.lateFeeApplied) {
            await this.applyLateFee(invoice.id);
            lateFeesApplied++;
          }

          // TODO: Send overdue notification (requires Alerts Module)
          this.logger.warn(
            `Invoice ${invoice.invoiceNumber} is overdue (user: ${invoice.userId})`
          );
        } catch (error) {
          this.logger.error(
            `Failed to process overdue invoice ${invoice.id}`,
            error
          );
        }
      }

      this.logger.info(
        `Processed ${overdueInvoices.length} overdue invoices, applied ${lateFeesApplied} late fees`
      );

      return {
        processed: overdueInvoices.length,
        lateFeesApplied,
      };
    } catch (error) {
      this.logger.error('Failed to process overdue invoices', error);
      return { processed: 0, lateFeesApplied: 0 };
    }
  }

  /**
   * Get billing summary for user
   *
   * @param userId User ID
   * @returns Billing summary
   */
  async getBillingSummary(userId: string): Promise<{
    totalOutstanding: number;
    overdueAmount: number;
    pendingInvoices: number;
    paidInvoices: number;
    nextDueDate?: Date;
  }> {
    try {
      const invoices = await this.invoiceService.getInvoicesForUser(userId);

      const today = new Date();

      const pending = invoices.filter((inv) => inv.status === 'pending');
      const overdue = pending.filter((inv) => isBefore(inv.dueDate, today));
      const paid = invoices.filter((inv) => inv.status === 'paid');

      const totalOutstanding = pending.reduce((sum, inv) => sum + inv.total, 0);
      const overdueAmount = overdue.reduce((sum, inv) => sum + inv.total, 0);

      // Get next due date
      const upcomingInvoices = pending
        .filter((inv) => !isBefore(inv.dueDate, today))
        .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

      const nextDueDate = upcomingInvoices[0]?.dueDate;

      return {
        totalOutstanding,
        overdueAmount,
        pendingInvoices: pending.length,
        paidInvoices: paid.length,
        nextDueDate,
      };
    } catch (error) {
      this.logger.error(`Failed to get billing summary for user ${userId}`, error);
      throw error;
    }
  }

  /**
   * Process monthly billing for all users
   *
   * Creates invoices for all unbilled transactions
   * Should be run monthly via cron job
   */
  async processMonthlyBilling(): Promise<{
    usersProcessed: number;
    invoicesCreated: number;
  }> {
    try {
      this.logger.info('Starting monthly billing process...');

      // Get all users with unbilled transactions
      const unbilledTransactions = await this.repository.readOnlyDbConnection.query(
        `SELECT
          id_tag as user_id,
          array_agg(id) as transaction_ids,
          COUNT(*) as transaction_count,
          SUM(total_cost) as total_amount
        FROM "Transactions"
        WHERE invoice_id IS NULL
        AND time_end IS NOT NULL
        AND total_cost > 0
        GROUP BY id_tag`,
        { type: 'SELECT' }
      );

      let invoicesCreated = 0;

      for (const record of unbilledTransactions) {
        try {
          const { invoice } = await this.processBilling(
            record.user_id,
            record.transaction_ids,
            this.config.autoChargeEnabled
          );

          this.logger.info(
            `Monthly invoice created for user ${record.user_id}: ${invoice.invoiceNumber} - $${invoice.total.toFixed(2)}`
          );

          invoicesCreated++;
        } catch (error) {
          this.logger.error(
            `Failed to process monthly billing for user ${record.user_id}`,
            error
          );
        }
      }

      this.logger.info(
        `Monthly billing complete: ${invoicesCreated} invoices created for ${unbilledTransactions.length} users`
      );

      return {
        usersProcessed: unbilledTransactions.length,
        invoicesCreated,
      };
    } catch (error) {
      this.logger.error('Failed to process monthly billing', error);
      return { usersProcessed: 0, invoicesCreated: 0 };
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private async applyLateFee(invoiceId: string): Promise<void> {
    const invoice = await this.invoiceService.getInvoice(invoiceId);

    if (!invoice) return;

    const lateFee = invoice.total * this.config.lateFeePercentage;

    await this.repository.readOnlyDbConnection.models.invoices.update(
      {
        total: invoice.total + lateFee,
        lateFeeApplied: true,
        updatedAt: new Date(),
      },
      { where: { id: invoiceId } }
    );

    this.logger.info(
      `Late fee applied to invoice ${invoice.invoiceNumber}: $${lateFee.toFixed(2)}`
    );
  }
}

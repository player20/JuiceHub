/**
 * Invoice Service
 *
 * Handles invoice generation, PDF creation, and invoice management
 * PDF generation works without external API keys
 */

import { ILogger } from '@citrineos/base';
import { SequelizeRepository } from '@citrineos/data';
import PDFDocument from 'pdfkit';
import { createWriteStream } from 'fs';
import { join } from 'path';
import { addDays, format } from 'date-fns';
import {
  BillingConfig,
  DEFAULT_BILLING_CONFIG,
  CreateInvoiceRequest,
  Invoice,
  InvoiceLineItem,
} from './interfaces';

export class InvoiceService {
  private readonly logger: ILogger;
  private readonly repository: SequelizeRepository;
  private readonly config: BillingConfig;
  private readonly invoiceDir: string;

  constructor(
    logger: ILogger,
    repository: SequelizeRepository,
    config: BillingConfig = DEFAULT_BILLING_CONFIG,
    invoiceDir: string = './invoices'
  ) {
    this.logger = logger;
    this.repository = repository;
    this.config = config;
    this.invoiceDir = invoiceDir;
  }

  /**
   * Create invoice from transactions
   *
   * @param request Invoice creation request
   * @returns Created invoice
   */
  async createInvoice(request: CreateInvoiceRequest): Promise<Invoice> {
    try {
      this.logger.info(
        `Creating invoice for user ${request.userId} with ${request.transactionIds?.length || 0} transactions`
      );

      // Get transactions
      const transactions = request.transactionIds
        ? await this.getTransactions(request.transactionIds)
        : [];

      // Calculate totals
      const subtotal = transactions.reduce(
        (sum, tx) => sum + (Number(tx.total_cost) || 0),
        0
      );
      const tax = subtotal * this.config.taxRate;
      const total = subtotal + tax;

      // Generate invoice number
      const invoiceNumber = await this.generateInvoiceNumber();

      // Calculate due date
      const dueDate =
        request.dueDate || addDays(new Date(), this.config.invoiceDueDays);

      // Create invoice
      const invoice: Partial<Invoice> = {
        userId: request.userId,
        tenantId: request.tenantId,
        invoiceNumber,
        status: 'pending',
        subtotal,
        tax,
        total,
        currency: this.config.currency,
        dueDate,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const [createdInvoice] = await this.repository.readOnlyDbConnection.models.invoices.create(
        invoice
      );

      // Create line items
      const lineItems = await this.createLineItems(
        createdInvoice.id,
        transactions
      );

      // Generate PDF
      const pdfUrl = await this.generatePDF({
        ...createdInvoice,
        lineItems,
      } as Invoice);

      // Update invoice with PDF URL
      await this.repository.readOnlyDbConnection.models.invoices.update(
        { pdfUrl },
        { where: { id: createdInvoice.id } }
      );

      this.logger.info(
        `Invoice created: ${invoiceNumber} - $${total.toFixed(2)}`
      );

      return {
        ...createdInvoice,
        pdfUrl,
        lineItems,
      } as Invoice;
    } catch (error) {
      this.logger.error('Failed to create invoice', error);
      throw error;
    }
  }

  /**
   * Get invoice by ID
   *
   * @param invoiceId Invoice ID
   * @returns Invoice with line items
   */
  async getInvoice(invoiceId: string): Promise<Invoice | null> {
    try {
      const invoice = await this.repository.readOnlyDbConnection.models.invoices.findOne({
        where: { id: invoiceId },
      });

      if (!invoice) return null;

      const lineItems = await this.repository.readOnlyDbConnection.models.invoice_line_items.findAll({
        where: { invoiceId },
      });

      return {
        ...invoice,
        lineItems,
      } as Invoice;
    } catch (error) {
      this.logger.error(`Failed to get invoice ${invoiceId}`, error);
      return null;
    }
  }

  /**
   * Get invoices for user
   *
   * @param userId User ID
   * @param status Optional status filter
   * @returns List of invoices
   */
  async getInvoicesForUser(
    userId: string,
    status?: Invoice['status']
  ): Promise<Invoice[]> {
    try {
      const where: any = { userId };
      if (status) {
        where.status = status;
      }

      const invoices = await this.repository.readOnlyDbConnection.models.invoices.findAll({
        where,
        order: [['createdAt', 'DESC']],
      });

      return invoices as Invoice[];
    } catch (error) {
      this.logger.error(`Failed to get invoices for user ${userId}`, error);
      return [];
    }
  }

  /**
   * Mark invoice as paid
   *
   * @param invoiceId Invoice ID
   * @returns Updated invoice
   */
  async markAsPaid(invoiceId: string): Promise<Invoice | null> {
    try {
      await this.repository.readOnlyDbConnection.models.invoices.update(
        {
          status: 'paid',
          paidAt: new Date(),
          updatedAt: new Date(),
        },
        { where: { id: invoiceId } }
      );

      this.logger.info(`Invoice marked as paid: ${invoiceId}`);

      return await this.getInvoice(invoiceId);
    } catch (error) {
      this.logger.error(`Failed to mark invoice as paid: ${invoiceId}`, error);
      throw error;
    }
  }

  /**
   * Cancel invoice
   *
   * @param invoiceId Invoice ID
   * @returns Updated invoice
   */
  async cancelInvoice(invoiceId: string): Promise<Invoice | null> {
    try {
      await this.repository.readOnlyDbConnection.models.invoices.update(
        {
          status: 'cancelled',
          updatedAt: new Date(),
        },
        { where: { id: invoiceId } }
      );

      this.logger.info(`Invoice cancelled: ${invoiceId}`);

      return await this.getInvoice(invoiceId);
    } catch (error) {
      this.logger.error(`Failed to cancel invoice: ${invoiceId}`, error);
      throw error;
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private async getTransactions(transactionIds: string[]): Promise<any[]> {
    const transactions = await this.repository.readOnlyDbConnection.query(
      `SELECT * FROM "Transactions" WHERE id = ANY(:transactionIds)`,
      {
        replacements: { transactionIds },
        type: 'SELECT',
      }
    );

    return transactions;
  }

  private async createLineItems(
    invoiceId: string,
    transactions: any[]
  ): Promise<InvoiceLineItem[]> {
    const lineItems: Partial<InvoiceLineItem>[] = transactions.map((tx) => ({
      invoiceId,
      description: `Charging session at ${tx.station_id} on ${format(
        new Date(tx.time_start),
        'MMM dd, yyyy'
      )}`,
      quantity: 1,
      unitPrice: Number(tx.total_cost) || 0,
      total: Number(tx.total_cost) || 0,
      transactionId: tx.id,
      createdAt: new Date(),
    }));

    const created = await this.repository.readOnlyDbConnection.models.invoice_line_items.bulkCreate(
      lineItems
    );

    return created as InvoiceLineItem[];
  }

  private async generateInvoiceNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.repository.readOnlyDbConnection.models.invoices.count({
      where: {
        invoiceNumber: {
          $like: `INV-${year}-%`,
        },
      },
    });

    const nextNumber = (count + 1).toString().padStart(6, '0');
    return `INV-${year}-${nextNumber}`;
  }

  private async generatePDF(invoice: Invoice): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        const filename = `${invoice.invoiceNumber}.pdf`;
        const filepath = join(this.invoiceDir, filename);

        const doc = new PDFDocument({ margin: 50 });
        const stream = createWriteStream(filepath);

        doc.pipe(stream);

        // Header
        doc
          .fontSize(20)
          .text('INVOICE', 50, 50)
          .fontSize(10)
          .text(`Invoice Number: ${invoice.invoiceNumber}`, 50, 80)
          .text(`Date: ${format(invoice.createdAt, 'MMM dd, yyyy')}`, 50, 95)
          .text(`Due Date: ${format(invoice.dueDate, 'MMM dd, yyyy')}`, 50, 110);

        // Status badge
        const statusColor =
          invoice.status === 'paid'
            ? 'green'
            : invoice.status === 'cancelled'
            ? 'red'
            : 'orange';
        doc
          .fontSize(12)
          .fillColor(statusColor)
          .text(invoice.status.toUpperCase(), 450, 50)
          .fillColor('black');

        // Line items table
        const tableTop = 150;
        doc
          .fontSize(10)
          .text('Description', 50, tableTop)
          .text('Quantity', 300, tableTop)
          .text('Unit Price', 370, tableTop)
          .text('Total', 480, tableTop);

        doc
          .moveTo(50, tableTop + 15)
          .lineTo(550, tableTop + 15)
          .stroke();

        let yPosition = tableTop + 25;

        invoice.lineItems?.forEach((item) => {
          doc
            .fontSize(9)
            .text(item.description, 50, yPosition, { width: 240 })
            .text(item.quantity.toString(), 300, yPosition)
            .text(`$${item.unitPrice.toFixed(2)}`, 370, yPosition)
            .text(`$${item.total.toFixed(2)}`, 480, yPosition);

          yPosition += 30;
        });

        // Totals
        yPosition += 20;
        doc
          .moveTo(50, yPosition)
          .lineTo(550, yPosition)
          .stroke();

        yPosition += 15;
        doc
          .fontSize(10)
          .text('Subtotal:', 370, yPosition)
          .text(`$${invoice.subtotal.toFixed(2)}`, 480, yPosition);

        yPosition += 20;
        doc
          .text(`Tax (${(this.config.taxRate * 100).toFixed(1)}%):`, 370, yPosition)
          .text(`$${invoice.tax.toFixed(2)}`, 480, yPosition);

        yPosition += 20;
        doc
          .fontSize(12)
          .text('Total:', 370, yPosition)
          .text(`$${invoice.total.toFixed(2)}`, 480, yPosition);

        // Footer
        doc
          .fontSize(8)
          .fillColor('gray')
          .text(
            'Thank you for your business!',
            50,
            700,
            { align: 'center', width: 500 }
          );

        doc.end();

        stream.on('finish', () => {
          this.logger.info(`PDF generated: ${filepath}`);
          resolve(filepath);
        });

        stream.on('error', reject);
      } catch (error) {
        reject(error);
      }
    });
  }
}

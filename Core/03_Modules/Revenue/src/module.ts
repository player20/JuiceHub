/**
 * Revenue Module
 *
 * Main module that wires together all revenue and billing services
 * Provides unified interface for payments, invoicing, and revenue analytics
 *
 * Stripe Integration (Optional):
 * - Set STRIPE_SECRET_KEY in environment to enable payment processing
 * - Set STRIPE_PUBLISHABLE_KEY for frontend integration
 * - Set STRIPE_WEBHOOK_SECRET for webhook verification
 *
 * If Stripe is not configured, the module will:
 * - Create placeholder payment records
 * - Generate invoices and PDFs normally
 * - Disable actual payment processing
 */

import { ILogger } from '@citrineos/base';
import { SequelizeRepository } from '@citrineos/data';
import {
  BillingConfig,
  DEFAULT_BILLING_CONFIG,
} from './module/interfaces';
import { PaymentService } from './module/PaymentService';
import { InvoiceService } from './module/InvoiceService';
import { BillingService } from './module/BillingService';
import { RevenueAnalyticsService } from './module/RevenueAnalyticsService';

/**
 * Revenue Module
 *
 * Provides comprehensive revenue management:
 * - Payment processing via Stripe (optional)
 * - Invoice generation and PDF creation
 * - Automated billing and late fees
 * - Revenue analytics and reporting
 */
export class RevenueModule {
  private readonly logger: ILogger;
  private readonly repository: SequelizeRepository;
  private readonly config: BillingConfig;

  public readonly payments: PaymentService;
  public readonly invoices: InvoiceService;
  public readonly billing: BillingService;
  public readonly analytics: RevenueAnalyticsService;

  constructor(
    logger: ILogger,
    repository: SequelizeRepository,
    config: BillingConfig = DEFAULT_BILLING_CONFIG,
    invoiceDir: string = './invoices'
  ) {
    this.logger = logger;
    this.repository = repository;
    this.config = config;

    // Initialize services
    this.payments = new PaymentService(logger, repository, config);
    this.invoices = new InvoiceService(logger, repository, config, invoiceDir);
    this.billing = new BillingService(
      logger,
      repository,
      this.invoices,
      this.payments,
      config
    );
    this.analytics = new RevenueAnalyticsService(logger, repository);

    // Log module status
    if (this.payments.isEnabled()) {
      this.logger.info('Revenue Module initialized with Stripe payment processing');
    } else {
      this.logger.info(
        'Revenue Module initialized without payment processing (Stripe not configured)'
      );
    }
  }

  /**
   * Run daily billing tasks
   *
   * Should be scheduled to run daily (e.g., via cron job)
   * Processes overdue invoices and applies late fees
   */
  async runDailyTasks(): Promise<void> {
    try {
      this.logger.info('Starting daily revenue tasks...');

      // Process overdue invoices
      const { processed, lateFeesApplied } =
        await this.billing.processOverdueInvoices();

      this.logger.info(
        `Daily revenue tasks complete: ${processed} overdue invoices processed, ${lateFeesApplied} late fees applied`
      );
    } catch (error) {
      this.logger.error('Failed to run daily revenue tasks', error);
      throw error;
    }
  }

  /**
   * Run monthly billing
   *
   * Should be scheduled to run monthly (e.g., via cron job)
   * Creates invoices for all unbilled transactions
   */
  async runMonthlyBilling(): Promise<void> {
    try {
      this.logger.info('Starting monthly billing...');

      const { usersProcessed, invoicesCreated } =
        await this.billing.processMonthlyBilling();

      this.logger.info(
        `Monthly billing complete: ${invoicesCreated} invoices created for ${usersProcessed} users`
      );
    } catch (error) {
      this.logger.error('Failed to run monthly billing', error);
      throw error;
    }
  }

  /**
   * Get revenue dashboard data
   *
   * Optimized method for revenue overview page
   */
  async getRevenueDashboard(tenantId?: string): Promise<{
    summary: Awaited<ReturnType<typeof this.analytics.getRevenueSummary>>;
    recentInvoices: Awaited<ReturnType<typeof this.invoices.getInvoicesForUser>>;
    topStations: Awaited<ReturnType<typeof this.analytics.getRevenueByStation>>;
  }> {
    try {
      this.logger.info('Fetching revenue dashboard data...');

      const now = new Date();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Note: This is simplified - in production you'd get recent invoices differently
      const [summary, topStations] = await Promise.all([
        this.analytics.getRevenueSummary(tenantId),
        this.analytics.getRevenueByStation(thirtyDaysAgo, now, tenantId, 10),
      ]);

      this.logger.info('Revenue dashboard data retrieved successfully');

      return {
        summary,
        recentInvoices: [], // Placeholder - implement proper invoice listing
        topStations,
      };
    } catch (error) {
      this.logger.error('Failed to get revenue dashboard', error);
      throw error;
    }
  }

  /**
   * Health check for revenue module
   *
   * Verifies database connectivity and Stripe configuration
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    databaseConnected: boolean;
    stripeConfigured: boolean;
    message: string;
  }> {
    try {
      // Test database connection
      await this.repository.readOnlyDbConnection.query('SELECT 1', {
        type: 'SELECT',
      });

      const stripeConfigured = this.payments.isEnabled();

      return {
        healthy: true,
        databaseConnected: true,
        stripeConfigured,
        message: stripeConfigured
          ? 'Revenue module is healthy with payment processing enabled'
          : 'Revenue module is healthy (payment processing disabled - Stripe not configured)',
      };
    } catch (error) {
      this.logger.error('Revenue module health check failed', error);
      return {
        healthy: false,
        databaseConnected: false,
        stripeConfigured: false,
        message: `Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Check if payment processing is enabled
   */
  public isPaymentProcessingEnabled(): boolean {
    return this.payments.isEnabled();
  }
}

/**
 * Factory function to create Revenue Module instance
 */
export function createRevenueModule(
  logger: ILogger,
  repository: SequelizeRepository,
  config?: BillingConfig,
  invoiceDir?: string
): RevenueModule {
  return new RevenueModule(logger, repository, config, invoiceDir);
}

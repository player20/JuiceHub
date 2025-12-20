/**
 * Payment Service
 *
 * Handles payment processing via Stripe
 * Gracefully degrades if Stripe API keys are not configured
 *
 * Setup Required:
 * - STRIPE_SECRET_KEY in environment
 * - STRIPE_PUBLISHABLE_KEY in environment
 * - STRIPE_WEBHOOK_SECRET (optional, for webhooks)
 */

import { ILogger } from '@citrineos/base';
import { SequelizeRepository } from '@citrineos/data';
import Stripe from 'stripe';
import {
  BillingConfig,
  DEFAULT_BILLING_CONFIG,
  CreatePaymentMethodRequest,
  CreatePaymentRequest,
  Payment,
  PaymentMethod,
  RefundRequest,
} from './interfaces';

export class PaymentService {
  private readonly logger: ILogger;
  private readonly repository: SequelizeRepository;
  private readonly config: BillingConfig;
  private stripe: Stripe | null = null;
  private readonly stripeEnabled: boolean;

  constructor(
    logger: ILogger,
    repository: SequelizeRepository,
    config: BillingConfig = DEFAULT_BILLING_CONFIG
  ) {
    this.logger = logger;
    this.repository = repository;
    this.config = config;

    // Initialize Stripe if API key is configured
    const apiKey = process.env.STRIPE_SECRET_KEY;
    if (apiKey && apiKey !== 'YOUR_STRIPE_SECRET_KEY_HERE') {
      try {
        this.stripe = new Stripe(apiKey, {
          apiVersion: '2024-11-20.acacia',
        });
        this.stripeEnabled = true;
        this.logger.info('Stripe payment service initialized successfully');
      } catch (error) {
        this.logger.error('Failed to initialize Stripe', error);
        this.stripeEnabled = false;
      }
    } else {
      this.stripeEnabled = false;
      this.logger.warn(
        'Stripe API key not configured - payment processing disabled. ' +
        'Set STRIPE_SECRET_KEY in environment to enable payments.'
      );
    }
  }

  /**
   * Check if Stripe payment processing is available
   */
  public isEnabled(): boolean {
    return this.stripeEnabled;
  }

  /**
   * Add payment method for a user
   *
   * @param request Payment method details
   * @returns Saved payment method
   */
  async addPaymentMethod(
    request: CreatePaymentMethodRequest
  ): Promise<PaymentMethod | null> {
    try {
      if (!this.stripeEnabled) {
        this.logger.warn('Cannot add payment method - Stripe not configured');
        return null;
      }

      // Attach payment method to customer in Stripe
      const stripeCustomerId = await this.getOrCreateStripeCustomer(request.userId);

      if (this.stripe) {
        await this.stripe.paymentMethods.attach(request.stripePaymentMethodId, {
          customer: stripeCustomerId,
        });

        // Get payment method details
        const stripePaymentMethod = await this.stripe.paymentMethods.retrieve(
          request.stripePaymentMethodId
        );

        // Set as default if requested
        if (request.isDefault && stripeCustomerId) {
          await this.stripe.customers.update(stripeCustomerId, {
            invoice_settings: {
              default_payment_method: request.stripePaymentMethodId,
            },
          });
        }

        // Save to database
        const paymentMethod: Partial<PaymentMethod> = {
          userId: request.userId,
          type: 'card',
          stripePaymentMethodId: stripePaymentMethod.id,
          last4: stripePaymentMethod.card?.last4,
          brand: stripePaymentMethod.card?.brand,
          expiryMonth: stripePaymentMethod.card?.exp_month,
          expiryYear: stripePaymentMethod.card?.exp_year,
          isDefault: request.isDefault || false,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const [result] = await this.repository.readOnlyDbConnection.models.payment_methods.create(
          paymentMethod
        );

        this.logger.info(
          `Payment method added for user ${request.userId}: ${stripePaymentMethod.card?.brand} ending in ${stripePaymentMethod.card?.last4}`
        );

        return result as PaymentMethod;
      }

      return null;
    } catch (error) {
      this.logger.error('Failed to add payment method', error);
      throw error;
    }
  }

  /**
   * Create payment
   *
   * @param request Payment details
   * @returns Payment record
   */
  async createPayment(request: CreatePaymentRequest): Promise<Payment | null> {
    try {
      if (!this.stripeEnabled) {
        this.logger.warn('Cannot create payment - Stripe not configured');
        return this.createPlaceholderPayment(request);
      }

      const amount = Math.round(request.amount * 100); // Convert to cents
      const currency = request.currency || this.config.currency;

      if (!this.stripe) {
        return this.createPlaceholderPayment(request);
      }

      // Create payment intent in Stripe
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount,
        currency: currency.toLowerCase(),
        payment_method: request.stripePaymentMethodId,
        confirm: true,
        description: request.description || `Payment for invoice ${request.invoiceId}`,
        automatic_payment_methods: request.stripePaymentMethodId
          ? undefined
          : { enabled: true },
      });

      // Save payment to database
      const payment: Partial<Payment> = {
        userId: request.userId,
        invoiceId: request.invoiceId,
        amount: request.amount,
        currency,
        status: this.mapStripeStatus(paymentIntent.status),
        paymentMethodId: request.paymentMethodId,
        stripePaymentIntentId: paymentIntent.id,
        stripeChargeId: paymentIntent.latest_charge as string,
        processedAt: paymentIntent.status === 'succeeded' ? new Date() : undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const [result] = await this.repository.readOnlyDbConnection.models.payments.create(
        payment
      );

      this.logger.info(
        `Payment created for user ${request.userId}: $${request.amount} - ${paymentIntent.status}`
      );

      return result as Payment;
    } catch (error) {
      this.logger.error('Failed to create payment', error);

      // Save failed payment to database
      const failedPayment: Partial<Payment> = {
        userId: request.userId,
        invoiceId: request.invoiceId,
        amount: request.amount,
        currency: request.currency || this.config.currency,
        status: 'failed',
        failureReason: error instanceof Error ? error.message : 'Unknown error',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await this.repository.readOnlyDbConnection.models.payments.create(failedPayment);

      throw error;
    }
  }

  /**
   * Refund payment
   *
   * @param request Refund details
   * @returns Updated payment record
   */
  async refundPayment(request: RefundRequest): Promise<Payment | null> {
    try {
      if (!this.stripeEnabled) {
        this.logger.warn('Cannot refund payment - Stripe not configured');
        return null;
      }

      // Get payment from database
      const payment = await this.repository.readOnlyDbConnection.models.payments.findOne({
        where: { id: request.paymentId },
      });

      if (!payment || !payment.stripeChargeId) {
        throw new Error('Payment not found or not processed via Stripe');
      }

      if (!this.stripe) {
        return null;
      }

      // Create refund in Stripe
      const refund = await this.stripe.refunds.create({
        charge: payment.stripeChargeId,
        amount: request.amount ? Math.round(request.amount * 100) : undefined,
        reason: request.reason as Stripe.RefundCreateParams.Reason,
      });

      // Update payment status
      await this.repository.readOnlyDbConnection.models.payments.update(
        {
          status: 'refunded',
          updatedAt: new Date(),
        },
        { where: { id: request.paymentId } }
      );

      this.logger.info(
        `Payment refunded: ${request.paymentId} - $${refund.amount / 100}`
      );

      const [updatedPayment] = await this.repository.readOnlyDbConnection.models.payments.findOne({
        where: { id: request.paymentId },
      });

      return updatedPayment as Payment;
    } catch (error) {
      this.logger.error('Failed to refund payment', error);
      throw error;
    }
  }

  /**
   * Get payment methods for user
   *
   * @param userId User ID
   * @returns List of payment methods
   */
  async getPaymentMethods(userId: string): Promise<PaymentMethod[]> {
    try {
      const methods = await this.repository.readOnlyDbConnection.models.payment_methods.findAll({
        where: { userId, isActive: true },
        order: [['isDefault', 'DESC'], ['createdAt', 'DESC']],
      });

      return methods as PaymentMethod[];
    } catch (error) {
      this.logger.error(`Failed to get payment methods for user ${userId}`, error);
      return [];
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private async getOrCreateStripeCustomer(userId: string): Promise<string | null> {
    if (!this.stripe) return null;

    // Check if customer exists in database
    const user = await this.repository.readOnlyDbConnection.models.Users.findOne({
      where: { id: userId },
    });

    if (user?.stripeCustomerId) {
      return user.stripeCustomerId;
    }

    // Create new Stripe customer
    const customer = await this.stripe.customers.create({
      metadata: { userId },
    });

    // Save customer ID to user record
    await this.repository.readOnlyDbConnection.models.Users.update(
      { stripeCustomerId: customer.id },
      { where: { id: userId } }
    );

    return customer.id;
  }

  private mapStripeStatus(
    stripeStatus: string
  ): 'pending' | 'processing' | 'succeeded' | 'failed' {
    switch (stripeStatus) {
      case 'succeeded':
        return 'succeeded';
      case 'processing':
        return 'processing';
      case 'requires_payment_method':
      case 'requires_confirmation':
      case 'requires_action':
        return 'pending';
      case 'canceled':
      case 'failed':
        return 'failed';
      default:
        return 'pending';
    }
  }

  private async createPlaceholderPayment(
    request: CreatePaymentRequest
  ): Promise<Payment> {
    // Create placeholder payment record when Stripe is not configured
    const payment: Partial<Payment> = {
      userId: request.userId,
      invoiceId: request.invoiceId,
      amount: request.amount,
      currency: request.currency || this.config.currency,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const [result] = await this.repository.readOnlyDbConnection.models.payments.create(
      payment
    );

    this.logger.info(
      `Placeholder payment created (Stripe not configured): $${request.amount}`
    );

    return result as Payment;
  }
}

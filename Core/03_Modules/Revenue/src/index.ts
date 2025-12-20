/**
 * Revenue Module - Public API
 *
 * Exports all public interfaces, services, and utilities
 */

// Main module
export { RevenueModule, createRevenueModule } from './module';

// Services
export { PaymentService } from './module/PaymentService';
export { InvoiceService } from './module/InvoiceService';
export { BillingService } from './module/BillingService';
export { RevenueAnalyticsService } from './module/RevenueAnalyticsService';

// Interfaces and types
export type {
  // Payment Methods
  PaymentMethod,
  CreatePaymentMethodRequest,

  // Invoices
  Invoice,
  InvoiceLineItem,
  CreateInvoiceRequest,

  // Payments
  Payment,
  CreatePaymentRequest,
  RefundRequest,

  // Configuration
  BillingConfig,
  StripeConfig,
  StripeWebhookEvent,

  // Analytics
  RevenueMetrics,
  RevenueByPeriod,
  RevenueByStation,
} from './module/interfaces';

// Default configuration
export { DEFAULT_BILLING_CONFIG } from './module/interfaces';

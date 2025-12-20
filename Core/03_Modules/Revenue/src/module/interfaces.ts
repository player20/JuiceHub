/**
 * Revenue Module - TypeScript Interfaces
 *
 * Defines types for payments, invoicing, and billing
 */

// ============================================================================
// PAYMENT METHODS
// ============================================================================

export interface PaymentMethod {
  id: string;
  tenantId?: string;
  userId: string;
  type: 'card' | 'bank_account' | 'wallet';
  stripePaymentMethodId?: string;
  last4?: string;
  brand?: string;
  expiryMonth?: number;
  expiryYear?: number;
  isDefault: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePaymentMethodRequest {
  userId: string;
  stripePaymentMethodId: string;
  isDefault?: boolean;
}

// ============================================================================
// INVOICES
// ============================================================================

export interface Invoice {
  id: string;
  tenantId?: string;
  userId: string;
  invoiceNumber: string;
  status: 'draft' | 'pending' | 'paid' | 'failed' | 'cancelled';
  subtotal: number;
  tax: number;
  total: number;
  currency: string;
  dueDate: Date;
  paidAt?: Date;
  stripeInvoiceId?: string;
  pdfUrl?: string;
  createdAt: Date;
  updatedAt: Date;
  lineItems?: InvoiceLineItem[];
}

export interface InvoiceLineItem {
  id: string;
  invoiceId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  transactionId?: string;
  createdAt: Date;
}

export interface CreateInvoiceRequest {
  userId: string;
  tenantId?: string;
  transactionIds?: string[];
  dueDate?: Date;
  autoCharge?: boolean;
}

// ============================================================================
// PAYMENTS
// ============================================================================

export interface Payment {
  id: string;
  tenantId?: string;
  userId: string;
  invoiceId?: string;
  amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'succeeded' | 'failed' | 'refunded';
  paymentMethodId?: string;
  stripePaymentIntentId?: string;
  stripeChargeId?: string;
  failureReason?: string;
  processedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePaymentRequest {
  userId: string;
  invoiceId?: string;
  amount: number;
  currency?: string;
  paymentMethodId?: string;
  stripePaymentMethodId?: string;
  description?: string;
}

export interface RefundRequest {
  paymentId: string;
  amount?: number;
  reason?: string;
}

// ============================================================================
// BILLING CONFIGURATION
// ============================================================================

export interface BillingConfig {
  taxRate: number; // e.g., 0.08 for 8%
  currency: string; // e.g., "USD"
  invoiceDueDays: number; // e.g., 30
  autoChargeEnabled: boolean;
  lateFeesEnabled: boolean;
  lateFeePercentage: number;
}

export const DEFAULT_BILLING_CONFIG: BillingConfig = {
  taxRate: 0.08,
  currency: 'USD',
  invoiceDueDays: 30,
  autoChargeEnabled: false,
  lateFeesEnabled: false,
  lateFeePercentage: 0.05,
};

// ============================================================================
// REVENUE ANALYTICS
// ============================================================================

export interface RevenueMetrics {
  period: {
    start: Date;
    end: Date;
  };
  totalRevenue: number;
  totalTransactions: number;
  avgTransactionValue: number;
  paidInvoices: number;
  pendingInvoices: number;
  failedPayments: number;
  refunds: number;
  netRevenue: number; // after refunds
}

export interface RevenueByPeriod {
  date: Date;
  revenue: number;
  transactions: number;
  refunds: number;
}

export interface RevenueByStation {
  stationId: string;
  stationName: string;
  revenue: number;
  transactions: number;
  avgRevenuePerTransaction: number;
}

// ============================================================================
// STRIPE CONFIGURATION
// ============================================================================

export interface StripeConfig {
  secretKey: string;
  publishableKey: string;
  webhookSecret?: string;
  apiVersion?: string;
}

export interface StripeWebhookEvent {
  id: string;
  type: string;
  data: any;
  created: number;
}

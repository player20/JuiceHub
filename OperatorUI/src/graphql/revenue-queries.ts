// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import { gql } from 'graphql-tag';

/**
 * Revenue Module GraphQL Queries
 *
 * NOTE: These queries require Hasura to be configured with the revenue schema.
 * Ensure the following tables are exposed via Hasura:
 * - invoices
 * - invoice_line_items
 * - payments
 * - billing_settings
 * - revenue_daily_summary
 */

// Get revenue summary metrics
export const GET_REVENUE_SUMMARY = gql`
  query GetRevenueSummary($startDate: date!, $endDate: date!) {
    revenue_daily_summary_aggregate(
      where: { date: { _gte: $startDate, _lte: $endDate } }
    ) {
      aggregate {
        sum {
          total_revenue
          total_invoiced
          total_paid
          total_pending
          total_overdue
        }
      }
    }
  }
`;

// Get revenue daily trends
export const GET_REVENUE_TRENDS = gql`
  query GetRevenueTrends($startDate: date!, $endDate: date!) {
    revenue_daily_summary(
      where: { date: { _gte: $startDate, _lte: $endDate } }
      order_by: { date: asc }
    ) {
      id
      date
      total_revenue
      total_invoiced
      total_paid
      total_pending
      total_overdue
      invoice_count
      payment_count
    }
  }
`;

// Get invoices list with filtering
export const GET_INVOICES = gql`
  query GetInvoices(
    $limit: Int!
    $offset: Int!
    $where: invoices_bool_exp
    $orderBy: [invoices_order_by!]
  ) {
    invoices(
      limit: $limit
      offset: $offset
      where: $where
      order_by: $orderBy
    ) {
      id
      invoice_number
      customer_name
      customer_email
      issue_date
      due_date
      status
      total_amount
      amount_paid
      currency
      created_at
      LineItems_aggregate {
        aggregate {
          count
        }
      }
    }
    invoices_aggregate(where: $where) {
      aggregate {
        count
      }
    }
  }
`;

// Get invoice detail with line items
export const GET_INVOICE_DETAIL = gql`
  query GetInvoiceDetail($id: uuid!) {
    invoices_by_pk(id: $id) {
      id
      invoice_number
      customer_name
      customer_email
      customer_phone
      billing_address
      issue_date
      due_date
      status
      subtotal
      tax_amount
      tax_rate
      total_amount
      amount_paid
      currency
      notes
      pdf_path
      created_at
      updated_at
      LineItems {
        id
        description
        quantity
        unit_price
        total_price
        charging_session_id
        ChargingSession {
          id
          start_timestamp
          end_timestamp
          total_kwh
          charging_station_id
        }
      }
      Payments {
        id
        payment_date
        amount
        payment_method
        status
        transaction_id
        stripe_payment_intent_id
        notes
      }
    }
  }
`;

// Get payments list
export const GET_PAYMENTS = gql`
  query GetPayments(
    $limit: Int!
    $offset: Int!
    $where: payments_bool_exp
    $orderBy: [payments_order_by!]
  ) {
    payments(
      limit: $limit
      offset: $offset
      where: $where
      order_by: $orderBy
    ) {
      id
      invoice_id
      payment_date
      amount
      payment_method
      status
      transaction_id
      stripe_payment_intent_id
      stripe_charge_id
      notes
      created_at
      Invoice {
        invoice_number
        customer_name
        total_amount
      }
    }
    payments_aggregate(where: $where) {
      aggregate {
        count
        sum {
          amount
        }
      }
    }
  }
`;

// Get billing settings
export const GET_BILLING_SETTINGS = gql`
  query GetBillingSettings($tenantId: uuid!) {
    billing_settings(where: { tenant_id: { _eq: $tenantId } }) {
      id
      tenant_id
      default_tax_rate
      default_currency
      invoice_due_days
      auto_send_invoices
      auto_charge_on_due
      late_fee_percentage
      late_fee_grace_days
      stripe_enabled
      payment_terms
      invoice_footer_text
      created_at
      updated_at
    }
  }
`;

// Get top revenue stations
export const GET_TOP_REVENUE_STATIONS = gql`
  query GetTopRevenueStations($startDate: date!, $endDate: date!, $limit: Int!) {
    station_revenue_summary(
      where: {
        date: { _gte: $startDate, _lte: $endDate }
      }
      order_by: { total_revenue: desc }
      limit: $limit
    ) {
      charging_station_id
      total_revenue
      total_sessions
      avg_revenue_per_session
      ChargingStation {
        id
        station_id
        registration_status
        Location {
          name
          address
        }
      }
    }
  }
`;

// Create invoice mutation
export const CREATE_INVOICE = gql`
  mutation CreateInvoice($input: invoices_insert_input!) {
    insert_invoices_one(object: $input) {
      id
      invoice_number
      status
    }
  }
`;

// Update invoice mutation
export const UPDATE_INVOICE = gql`
  mutation UpdateInvoice($id: uuid!, $input: invoices_set_input!) {
    update_invoices_by_pk(pk_columns: { id: $id }, _set: $input) {
      id
      status
    }
  }
`;

// Record payment mutation
export const CREATE_PAYMENT = gql`
  mutation CreatePayment($input: payments_insert_input!) {
    insert_payments_one(object: $input) {
      id
      amount
      status
    }
  }
`;

// Update billing settings mutation
export const UPDATE_BILLING_SETTINGS = gql`
  mutation UpdateBillingSettings($id: uuid!, $input: billing_settings_set_input!) {
    update_billing_settings_by_pk(pk_columns: { id: $id }, _set: $input) {
      id
    }
  }
`;

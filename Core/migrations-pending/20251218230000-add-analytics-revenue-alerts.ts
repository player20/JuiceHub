import { Knex } from 'knex';

/**
 * Migration: Add Analytics, Revenue, and Alerts Tables
 * Date: 2025-12-18
 *
 * Purpose: Add comprehensive analytics, revenue tracking, and alerting capabilities
 *
 * Tables Created:
 * - usage_snapshots: Daily usage aggregation
 * - station_performance_daily: Station health and performance metrics
 * - payment_methods: User payment method storage
 * - invoices: Invoice generation and tracking
 * - invoice_line_items: Invoice line item details
 * - payments: Payment transaction tracking
 * - alert_rules: Alert rule configuration
 * - alert_notifications: Alert notification channels
 * - alert_instances: Alert occurrence tracking
 * - incidents: Incident management
 */

export async function up(knex: Knex): Promise<void> {
  // ============================================================================
  // ANALYTICS TABLES
  // ============================================================================

  // Usage snapshots for daily aggregation
  await knex.schema.createTable('usage_snapshots', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').references('id').inTable('Tenants').onDelete('CASCADE');
    table.date('snapshot_date').notNullable();
    table.integer('total_sessions').defaultTo(0);
    table.decimal('total_energy_kwh', 10, 2).defaultTo(0);
    table.integer('total_duration_minutes').defaultTo(0);
    table.decimal('total_revenue', 10, 2).defaultTo(0);
    table.integer('unique_users').defaultTo(0);
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.unique(['tenant_id', 'snapshot_date']);
    table.index('snapshot_date', 'idx_usage_snapshots_date');
    table.index(['tenant_id', 'snapshot_date'], 'idx_usage_snapshots_tenant');

    table.comment('Daily usage statistics aggregation for analytics');
  });

  // Station performance tracking
  await knex.schema.createTable('station_performance_daily', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('charging_station_id').references('id').inTable('ChargingStations').onDelete('CASCADE');
    table.date('date').notNullable();
    table.decimal('uptime_percentage', 5, 2).defaultTo(0);
    table.integer('total_sessions').defaultTo(0);
    table.integer('successful_sessions').defaultTo(0);
    table.integer('failed_sessions').defaultTo(0);
    table.decimal('total_energy_kwh', 10, 2).defaultTo(0);
    table.decimal('total_revenue', 10, 2).defaultTo(0);
    table.integer('health_score').defaultTo(100); // 0-100
    table.integer('avg_session_duration_minutes').defaultTo(0);
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.unique(['charging_station_id', 'date']);
    table.index(['charging_station_id', 'date'], 'idx_station_performance_station');
    table.index('date', 'idx_station_performance_date');
    table.index('health_score', 'idx_station_performance_health');

    table.comment('Daily station performance and health metrics');
  });

  // ============================================================================
  // REVENUE TABLES
  // ============================================================================

  // Payment methods
  await knex.schema.createTable('payment_methods', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable();
    table.string('stripe_payment_method_id', 255);
    table.string('type', 50); // card, bank_account
    table.string('last4', 4);
    table.string('brand', 50);
    table.integer('exp_month');
    table.integer('exp_year');
    table.boolean('is_default').defaultTo(false);
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.index('user_id', 'idx_payment_methods_user');

    table.comment('User payment method storage (Stripe integration)');
  });

  // Invoices
  await knex.schema.createTable('invoices', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('invoice_number', 50).unique().notNullable();
    table.uuid('transaction_id').references('id').inTable('Transactions').onDelete('SET NULL');
    table.uuid('tenant_id').references('id').inTable('Tenants').onDelete('CASCADE');
    table.uuid('user_id');
    table.string('status', 50).defaultTo('draft'); // draft, sent, paid, failed, refunded
    table.decimal('subtotal', 10, 2).notNullable();
    table.decimal('tax', 10, 2).defaultTo(0);
    table.decimal('total_amount', 10, 2).notNullable();
    table.string('currency', 3).defaultTo('USD');
    table.string('pdf_url', 500);
    table.string('stripe_invoice_id', 255);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('sent_at');
    table.timestamp('paid_at');
    table.date('due_date');

    table.index('status', 'idx_invoices_status');
    table.index('created_at', 'idx_invoices_created');
    table.index('user_id', 'idx_invoices_user');

    table.comment('Invoice generation and tracking');
  });

  // Invoice line items
  await knex.schema.createTable('invoice_line_items', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('invoice_id').references('id').inTable('invoices').onDelete('CASCADE');
    table.text('description').notNullable();
    table.decimal('quantity', 10, 2).defaultTo(1);
    table.decimal('unit_price', 10, 2).notNullable();
    table.decimal('amount', 10, 2).notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.index('invoice_id', 'idx_invoice_line_items_invoice');

    table.comment('Invoice line item details');
  });

  // Payments
  await knex.schema.createTable('payments', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('invoice_id').references('id').inTable('invoices').onDelete('SET NULL');
    table.uuid('transaction_id').references('id').inTable('Transactions').onDelete('SET NULL');
    table.string('stripe_payment_intent_id', 255);
    table.decimal('amount', 10, 2).notNullable();
    table.string('currency', 3).defaultTo('USD');
    table.string('status', 50); // succeeded, failed, pending, refunded
    table.string('payment_method', 50);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('completed_at');

    table.index('status', 'idx_payments_status');
    table.index('created_at', 'idx_payments_created');

    table.comment('Payment transaction tracking');
  });

  // ============================================================================
  // ALERTS TABLES
  // ============================================================================

  // Alert rules
  await knex.schema.createTable('alert_rules', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').references('id').inTable('Tenants').onDelete('CASCADE');
    table.string('name', 255).notNullable();
    table.text('description');
    table.string('rule_type', 100).notNullable(); // station_offline, low_uptime, transaction_failed, etc.
    table.jsonb('condition').notNullable(); // { threshold: 30, comparison: 'gt', unit: 'minutes' }
    table.string('severity', 50).defaultTo('warning'); // info, warning, critical
    table.boolean('is_enabled').defaultTo(true);
    table.uuid('created_by');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    table.index('is_enabled', 'idx_alert_rules_enabled');
    table.index('tenant_id', 'idx_alert_rules_tenant');

    table.comment('Alert rule configuration');
  });

  // Alert notifications
  await knex.schema.createTable('alert_notifications', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('alert_rule_id').references('id').inTable('alert_rules').onDelete('CASCADE');
    table.string('channel', 50).notNullable(); // email, sms, webhook
    table.string('recipient', 255).notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.index('alert_rule_id', 'idx_alert_notifications_rule');

    table.comment('Alert notification channel configuration');
  });

  // Alert instances
  await knex.schema.createTable('alert_instances', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('alert_rule_id').references('id').inTable('alert_rules').onDelete('CASCADE');
    table.uuid('charging_station_id').references('id').inTable('ChargingStations').onDelete('CASCADE');
    table.string('severity', 50);
    table.string('status', 50).defaultTo('active'); // active, acknowledged, resolved
    table.timestamp('triggered_at').defaultTo(knex.fn.now());
    table.timestamp('acknowledged_at');
    table.uuid('acknowledged_by');
    table.timestamp('resolved_at');
    table.text('message');
    table.jsonb('metadata');

    table.index('status', 'idx_alert_instances_status');
    table.index('charging_station_id', 'idx_alert_instances_station');
    table.index('triggered_at', 'idx_alert_instances_triggered');

    table.comment('Alert occurrence tracking');
  });

  // Incidents
  await knex.schema.createTable('incidents', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('alert_instance_id').references('id').inTable('alert_instances').onDelete('SET NULL');
    table.uuid('charging_station_id').references('id').inTable('ChargingStations').onDelete('CASCADE');
    table.string('severity', 50);
    table.string('status', 50).defaultTo('open'); // open, in_progress, resolved, closed
    table.string('title', 255).notNullable();
    table.text('description');
    table.uuid('assigned_to');
    table.text('resolution_notes');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('resolved_at');

    table.index('status', 'idx_incidents_status');
    table.index('assigned_to', 'idx_incidents_assigned');
    table.index('charging_station_id', 'idx_incidents_station');

    table.comment('Incident management and tracking');
  });
}

export async function down(knex: Knex): Promise<void> {
  // Drop tables in reverse order to respect foreign keys
  await knex.schema.dropTableIfExists('incidents');
  await knex.schema.dropTableIfExists('alert_instances');
  await knex.schema.dropTableIfExists('alert_notifications');
  await knex.schema.dropTableIfExists('alert_rules');

  await knex.schema.dropTableIfExists('payments');
  await knex.schema.dropTableIfExists('invoice_line_items');
  await knex.schema.dropTableIfExists('invoices');
  await knex.schema.dropTableIfExists('payment_methods');

  await knex.schema.dropTableIfExists('station_performance_daily');
  await knex.schema.dropTableIfExists('usage_snapshots');
}

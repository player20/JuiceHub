/**
 * Revenue Analytics Service
 *
 * Provides revenue metrics and analytics
 * No external API keys required
 */

import { ILogger } from '@citrineos/base';
import { SequelizeRepository } from '@citrineos/data';
import { startOfDay, endOfDay } from 'date-fns';
import {
  RevenueMetrics,
  RevenueByPeriod,
  RevenueByStation,
} from './interfaces';

export class RevenueAnalyticsService {
  private readonly logger: ILogger;
  private readonly repository: SequelizeRepository;

  constructor(logger: ILogger, repository: SequelizeRepository) {
    this.logger = logger;
    this.repository = repository;
  }

  /**
   * Get revenue metrics for a period
   *
   * @param startDate Start of period
   * @param endDate End of period
   * @param tenantId Optional tenant filter
   * @returns Revenue metrics
   */
  async getRevenueMetrics(
    startDate: Date,
    endDate: Date,
    tenantId?: string
  ): Promise<RevenueMetrics> {
    try {
      this.logger.info(
        `Calculating revenue metrics from ${startDate.toISOString()} to ${endDate.toISOString()}`
      );

      const tenantFilter = tenantId ? 'AND p.tenant_id = :tenantId' : '';

      // Get payment statistics
      const query = `
        SELECT
          COUNT(DISTINCT p.id) as total_transactions,
          COUNT(DISTINCT CASE WHEN p.status = 'succeeded' THEN p.id END) as successful_payments,
          COUNT(DISTINCT CASE WHEN p.status = 'failed' THEN p.id END) as failed_payments,
          COUNT(DISTINCT CASE WHEN p.status = 'refunded' THEN p.id END) as refunds,
          COALESCE(SUM(CASE WHEN p.status = 'succeeded' THEN p.amount ELSE 0 END), 0) as total_revenue,
          COALESCE(SUM(CASE WHEN p.status = 'refunded' THEN p.amount ELSE 0 END), 0) as refunded_amount
        FROM payments p
        WHERE p.created_at >= :startDate
        AND p.created_at <= :endDate
        ${tenantFilter}
      `;

      const [stats] = await this.repository.readOnlyDbConnection.query(query, {
        replacements: { startDate, endDate, tenantId },
        type: 'SELECT',
      });

      // Get invoice statistics
      const invoiceQuery = `
        SELECT
          COUNT(DISTINCT CASE WHEN status = 'paid' THEN id END) as paid_invoices,
          COUNT(DISTINCT CASE WHEN status = 'pending' THEN id END) as pending_invoices
        FROM invoices
        WHERE created_at >= :startDate
        AND created_at <= :endDate
        ${tenantFilter.replace('p.', '')}
      `;

      const [invoiceStats] = await this.repository.readOnlyDbConnection.query(
        invoiceQuery,
        {
          replacements: { startDate, endDate, tenantId },
          type: 'SELECT',
        }
      );

      const totalRevenue = Number(stats.total_revenue) || 0;
      const refundedAmount = Number(stats.refunded_amount) || 0;
      const totalTransactions = Number(stats.total_transactions) || 0;

      const metrics: RevenueMetrics = {
        period: { start: startDate, end: endDate },
        totalRevenue,
        totalTransactions,
        avgTransactionValue:
          totalTransactions > 0 ? totalRevenue / totalTransactions : 0,
        paidInvoices: Number(invoiceStats.paid_invoices) || 0,
        pendingInvoices: Number(invoiceStats.pending_invoices) || 0,
        failedPayments: Number(stats.failed_payments) || 0,
        refunds: Number(stats.refunds) || 0,
        netRevenue: totalRevenue - refundedAmount,
      };

      this.logger.info(
        `Revenue metrics: $${totalRevenue.toFixed(2)} revenue, ${totalTransactions} transactions`
      );

      return metrics;
    } catch (error) {
      this.logger.error('Failed to get revenue metrics', error);
      throw error;
    }
  }

  /**
   * Get revenue by day for charting
   *
   * @param startDate Start of period
   * @param endDate End of period
   * @param tenantId Optional tenant filter
   * @returns Daily revenue data
   */
  async getRevenueByDay(
    startDate: Date,
    endDate: Date,
    tenantId?: string
  ): Promise<RevenueByPeriod[]> {
    try {
      const tenantFilter = tenantId ? 'AND tenant_id = :tenantId' : '';

      const query = `
        SELECT
          DATE(created_at) as date,
          COUNT(DISTINCT CASE WHEN status = 'succeeded' THEN id END) as transactions,
          COALESCE(SUM(CASE WHEN status = 'succeeded' THEN amount ELSE 0 END), 0) as revenue,
          COALESCE(SUM(CASE WHEN status = 'refunded' THEN amount ELSE 0 END), 0) as refunds
        FROM payments
        WHERE created_at >= :startDate
        AND created_at <= :endDate
        ${tenantFilter}
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `;

      const results = await this.repository.readOnlyDbConnection.query(query, {
        replacements: { startDate, endDate, tenantId },
        type: 'SELECT',
      });

      return results.map((row) => ({
        date: new Date(row.date),
        revenue: Number(row.revenue) || 0,
        transactions: Number(row.transactions) || 0,
        refunds: Number(row.refunds) || 0,
      }));
    } catch (error) {
      this.logger.error('Failed to get revenue by day', error);
      return [];
    }
  }

  /**
   * Get revenue by station
   *
   * @param startDate Start of period
   * @param endDate End of period
   * @param tenantId Optional tenant filter
   * @param limit Maximum results (default: 10)
   * @returns Revenue by station
   */
  async getRevenueByStation(
    startDate: Date,
    endDate: Date,
    tenantId?: string,
    limit: number = 10
  ): Promise<RevenueByStation[]> {
    try {
      const tenantFilter = tenantId ? 'AND t.tenant_id = :tenantId' : '';

      const query = `
        SELECT
          cs.id as station_id,
          cs.station_id as station_name,
          COUNT(DISTINCT t.id) as transactions,
          COALESCE(SUM(t.total_cost), 0) as revenue
        FROM "Transactions" t
        INNER JOIN "ChargingStations" cs ON t.charging_station_id = cs.id
        WHERE t.time_start >= :startDate
        AND t.time_start <= :endDate
        ${tenantFilter}
        GROUP BY cs.id, cs.station_id
        ORDER BY revenue DESC
        LIMIT :limit
      `;

      const results = await this.repository.readOnlyDbConnection.query(query, {
        replacements: { startDate, endDate, tenantId, limit },
        type: 'SELECT',
      });

      return results.map((row) => {
        const revenue = Number(row.revenue) || 0;
        const transactions = Number(row.transactions) || 0;

        return {
          stationId: row.station_id,
          stationName: row.station_name,
          revenue,
          transactions,
          avgRevenuePerTransaction:
            transactions > 0 ? revenue / transactions : 0,
        };
      });
    } catch (error) {
      this.logger.error('Failed to get revenue by station', error);
      return [];
    }
  }

  /**
   * Get revenue summary for dashboard
   *
   * @param tenantId Optional tenant filter
   * @returns Quick revenue stats
   */
  async getRevenueSummary(tenantId?: string): Promise<{
    today: RevenueMetrics;
    thisMonth: RevenueMetrics;
    allTime: {
      totalRevenue: number;
      totalTransactions: number;
    };
  }> {
    try {
      const now = new Date();
      const startOfToday = startOfDay(now);
      const endOfToday = endOfDay(now);

      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const [today, thisMonth] = await Promise.all([
        this.getRevenueMetrics(startOfToday, endOfToday, tenantId),
        this.getRevenueMetrics(startOfMonth, endOfMonth, tenantId),
      ]);

      // Get all-time stats
      const tenantFilter = tenantId ? 'WHERE tenant_id = :tenantId' : '';

      const allTimeQuery = `
        SELECT
          COALESCE(SUM(CASE WHEN status = 'succeeded' THEN amount ELSE 0 END), 0) as total_revenue,
          COUNT(DISTINCT CASE WHEN status = 'succeeded' THEN id END) as total_transactions
        FROM payments
        ${tenantFilter}
      `;

      const [allTimeStats] = await this.repository.readOnlyDbConnection.query(
        allTimeQuery,
        {
          replacements: { tenantId },
          type: 'SELECT',
        }
      );

      return {
        today,
        thisMonth,
        allTime: {
          totalRevenue: Number(allTimeStats.total_revenue) || 0,
          totalTransactions: Number(allTimeStats.total_transactions) || 0,
        },
      };
    } catch (error) {
      this.logger.error('Failed to get revenue summary', error);
      throw error;
    }
  }

  /**
   * Get payment success rate
   *
   * @param startDate Start of period
   * @param endDate End of period
   * @param tenantId Optional tenant filter
   * @returns Success rate percentage
   */
  async getPaymentSuccessRate(
    startDate: Date,
    endDate: Date,
    tenantId?: string
  ): Promise<number> {
    try {
      const tenantFilter = tenantId ? 'AND tenant_id = :tenantId' : '';

      const query = `
        SELECT
          COUNT(*) as total_attempts,
          COUNT(CASE WHEN status = 'succeeded' THEN 1 END) as successful
        FROM payments
        WHERE created_at >= :startDate
        AND created_at <= :endDate
        ${tenantFilter}
      `;

      const [stats] = await this.repository.readOnlyDbConnection.query(query, {
        replacements: { startDate, endDate, tenantId },
        type: 'SELECT',
      });

      const totalAttempts = Number(stats.total_attempts) || 0;
      const successful = Number(stats.successful) || 0;

      return totalAttempts > 0 ? (successful / totalAttempts) * 100 : 0;
    } catch (error) {
      this.logger.error('Failed to get payment success rate', error);
      return 0;
    }
  }
}

/**
 * Usage Analytics Service
 *
 * Calculates usage metrics, trends, and statistics
 * No external API keys required
 *
 * Provides:
 * - Daily/weekly/monthly usage aggregation
 * - Trend analysis and comparisons
 * - Top performers identification
 * - Network-wide statistics
 */

import { ILogger } from '@citrineos/base';
import { SequelizeRepository } from '@citrineos/data';
import {
  AnalyticsConfig,
  DEFAULT_ANALYTICS_CONFIG,
  UsageMetrics,
  UsageSnapshot,
  UsageTrend
} from './interfaces';
import { subDays, subMonths, startOfDay, endOfDay, format } from 'date-fns';

export class UsageAnalyticsService {
  private readonly logger: ILogger;
  private readonly repository: SequelizeRepository;
  private readonly config: AnalyticsConfig;

  constructor(
    logger: ILogger,
    repository: SequelizeRepository,
    config: AnalyticsConfig = DEFAULT_ANALYTICS_CONFIG
  ) {
    this.logger = logger;
    this.repository = repository;
    this.config = config;
  }

  /**
   * Get usage metrics for a period
   *
   * @param startDate Start of period
   * @param endDate End of period
   * @param tenantId Optional tenant filter
   * @returns Usage metrics with trend comparison
   */
  async getUsageMetrics(
    startDate: Date,
    endDate: Date,
    tenantId?: string
  ): Promise<UsageMetrics> {
    try {
      this.logger.info(
        `Calculating usage metrics from ${startDate.toISOString()} to ${endDate.toISOString()}`
      );

      // Get current period data
      const currentData = await this.getUsageData(startDate, endDate, tenantId);

      // Calculate period length for comparison
      const periodDays = Math.ceil(
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Get previous period data for trend comparison
      const prevEndDate = subDays(startDate, 1);
      const prevStartDate = subDays(prevEndDate, periodDays);
      const previousData = await this.getUsageData(prevStartDate, prevEndDate, tenantId);

      // Calculate metrics
      const totalSessions = this.sumField(currentData, 'total_sessions');
      const totalEnergyKwh = this.sumField(currentData, 'total_energy_kwh');
      const totalDurationMinutes = this.sumField(currentData, 'total_duration_minutes');
      const totalRevenue = this.sumField(currentData, 'total_revenue');
      const uniqueUsers = Math.max(...currentData.map(d => Number(d.unique_users) || 0), 0);

      const avgSessionDurationMinutes =
        totalSessions > 0 ? totalDurationMinutes / totalSessions : 0;
      const avgEnergyPerSession = totalSessions > 0 ? totalEnergyKwh / totalSessions : 0;
      const avgRevenuePerSession = totalSessions > 0 ? totalRevenue / totalSessions : 0;

      // Calculate trends
      const prevTotalSessions = this.sumField(previousData, 'total_sessions');
      const prevTotalEnergy = this.sumField(previousData, 'total_energy_kwh');
      const prevTotalRevenue = this.sumField(previousData, 'total_revenue');

      const trend = {
        sessions: this.calculatePercentChange(prevTotalSessions, totalSessions),
        energy: this.calculatePercentChange(prevTotalEnergy, totalEnergyKwh),
        revenue: this.calculatePercentChange(prevTotalRevenue, totalRevenue)
      };

      const result: UsageMetrics = {
        period: { start: startDate, end: endDate },
        totalSessions,
        totalEnergyKwh,
        totalDurationMinutes,
        totalRevenue,
        uniqueUsers,
        avgSessionDurationMinutes,
        avgEnergyPerSession,
        avgRevenuePerSession,
        trend
      };

      this.logger.info(
        `Usage metrics calculated: ${totalSessions} sessions, ${totalEnergyKwh.toFixed(2)} kWh, $${totalRevenue.toFixed(2)}`
      );

      return result;
    } catch (error) {
      this.logger.error('Failed to get usage metrics', error);
      throw error;
    }
  }

  /**
   * Get usage trends (daily breakdown)
   *
   * @param startDate Start of period
   * @param endDate End of period
   * @param tenantId Optional tenant filter
   * @returns Array of daily usage data
   */
  async getUsageTrends(
    startDate: Date,
    endDate: Date,
    tenantId?: string
  ): Promise<UsageTrend[]> {
    try {
      const data = await this.getUsageData(startDate, endDate, tenantId);

      const trends: UsageTrend[] = data.map(row => ({
        date: new Date(row.snapshot_date),
        sessions: Number(row.total_sessions) || 0,
        energyKwh: Number(row.total_energy_kwh) || 0,
        revenue: Number(row.total_revenue) || 0,
        users: Number(row.unique_users) || 0
      }));

      this.logger.info(`Retrieved ${trends.length} days of usage trend data`);

      return trends;
    } catch (error) {
      this.logger.error('Failed to get usage trends', error);
      throw error;
    }
  }

  /**
   * Save daily usage snapshot
   *
   * @param date Date for snapshot (defaults to today)
   * @param tenantId Optional tenant ID
   */
  async saveDailySnapshot(date: Date = new Date(), tenantId?: string): Promise<void> {
    try {
      const startDate = startOfDay(date);
      const endDate = endOfDay(date);

      this.logger.info(`Saving daily usage snapshot for ${format(date, 'yyyy-MM-dd')}`);

      // Calculate daily metrics
      const metrics = await this.calculateDailyMetrics(startDate, endDate, tenantId);

      // Save to database
      const snapshotData: Partial<UsageSnapshot> = {
        tenantId,
        snapshotDate: startDate,
        totalSessions: metrics.totalSessions,
        totalEnergyKwh: metrics.totalEnergyKwh,
        totalDurationMinutes: metrics.totalDurationMinutes,
        totalRevenue: metrics.totalRevenue,
        uniqueUsers: metrics.uniqueUsers,
        createdAt: new Date()
      };

      await this.repository.readOnlyDbConnection.models.usage_snapshots.upsert(
        snapshotData,
        {
          conflictFields: tenantId
            ? ['tenant_id', 'snapshot_date']
            : ['snapshot_date']
        }
      );

      this.logger.info(
        `Saved daily snapshot: ${metrics.totalSessions} sessions, ${metrics.totalEnergyKwh.toFixed(2)} kWh`
      );
    } catch (error) {
      this.logger.error(`Failed to save daily snapshot for ${format(date, 'yyyy-MM-dd')}`, error);
      throw error;
    }
  }

  /**
   * Get top performing stations by metric
   *
   * @param metric Metric to rank by (sessions | energy | revenue)
   * @param limit Number of results (default: 10)
   * @param startDate Start of period
   * @param endDate End of period
   * @param tenantId Optional tenant filter
   * @returns Top stations with usage data
   */
  async getTopStations(
    metric: 'sessions' | 'energy' | 'revenue',
    limit: number = 10,
    startDate: Date,
    endDate: Date,
    tenantId?: string
  ): Promise<Array<{
    stationId: string;
    stationName: string;
    sessions: number;
    energyKwh: number;
    revenue: number;
  }>> {
    try {
      const metricColumn = {
        sessions: 'total_sessions',
        energy: 'total_energy_kwh',
        revenue: 'total_revenue'
      }[metric];

      const tenantFilter = tenantId ? 'AND t.tenant_id = :tenantId' : '';

      const query = `
        SELECT
          cs.id as station_id,
          cs.station_id as station_name,
          COUNT(DISTINCT t.id) as sessions,
          COALESCE(SUM(CAST(t.meter_stop - t.meter_start AS DECIMAL)) / 1000.0, 0) as energy_kwh,
          COALESCE(SUM(t.total_cost), 0) as revenue
        FROM "Transactions" t
        INNER JOIN "ChargingStations" cs ON t.charging_station_id = cs.id
        WHERE t.time_start >= :startDate
        AND t.time_start <= :endDate
        ${tenantFilter}
        GROUP BY cs.id, cs.station_id
        ORDER BY ${metricColumn} DESC
        LIMIT :limit
      `;

      const results = await this.repository.readOnlyDbConnection.query(query, {
        replacements: { startDate, endDate, tenantId, limit },
        type: 'SELECT'
      });

      const topStations = results.map(row => ({
        stationId: row.station_id,
        stationName: row.station_name,
        sessions: Number(row.sessions) || 0,
        energyKwh: Number(row.energy_kwh) || 0,
        revenue: Number(row.revenue) || 0
      }));

      this.logger.info(
        `Retrieved top ${limit} stations by ${metric}: ${topStations.length} results`
      );

      return topStations;
    } catch (error) {
      this.logger.error(`Failed to get top stations by ${metric}`, error);
      return [];
    }
  }

  /**
   * Get quick stats for dashboard
   *
   * @param tenantId Optional tenant filter
   * @returns Quick stats for today, last 7 days, last 30 days
   */
  async getQuickStats(tenantId?: string): Promise<{
    today: UsageMetrics;
    last7Days: UsageMetrics;
    last30Days: UsageMetrics;
  }> {
    try {
      const now = new Date();
      const today = startOfDay(now);
      const sevenDaysAgo = subDays(now, 7);
      const thirtyDaysAgo = subDays(now, 30);

      const [todayStats, last7DaysStats, last30DaysStats] = await Promise.all([
        this.getUsageMetrics(today, now, tenantId),
        this.getUsageMetrics(sevenDaysAgo, now, tenantId),
        this.getUsageMetrics(thirtyDaysAgo, now, tenantId)
      ]);

      this.logger.info('Quick stats calculated for dashboard');

      return {
        today: todayStats,
        last7Days: last7DaysStats,
        last30Days: last30DaysStats
      };
    } catch (error) {
      this.logger.error('Failed to get quick stats', error);
      throw error;
    }
  }

  /**
   * Get network-wide summary statistics
   *
   * @param tenantId Optional tenant filter
   * @returns Network summary stats
   */
  async getNetworkSummary(tenantId?: string): Promise<{
    totalStations: number;
    activeStations: number;
    totalConnectors: number;
    availableConnectors: number;
    allTimeStats: {
      totalSessions: number;
      totalEnergyKwh: number;
      totalRevenue: number;
    };
  }> {
    try {
      const tenantFilter = tenantId ? 'WHERE cs.tenant_id = :tenantId' : '';

      // Get station and connector counts
      const stationQuery = `
        SELECT
          COUNT(DISTINCT cs.id) as total_stations,
          COUNT(DISTINCT CASE WHEN cs.registration_status = 'Accepted' THEN cs.id END) as active_stations,
          COUNT(c.id) as total_connectors
        FROM "ChargingStations" cs
        LEFT JOIN "Connectors" c ON cs.id = c.charging_station_id
        ${tenantFilter}
      `;

      const [stationStats] = await this.repository.readOnlyDbConnection.query(stationQuery, {
        replacements: { tenantId },
        type: 'SELECT'
      });

      // Get available connectors from latest status
      const availableQuery = `
        SELECT COUNT(DISTINCT connector_id) as available_connectors
        FROM "StatusNotifications" sn
        INNER JOIN "ChargingStations" cs ON sn.charging_station_id = cs.id
        WHERE sn.connector_status = 'Available'
        ${tenantFilter.replace('WHERE', 'AND')}
        AND sn.timestamp = (
          SELECT MAX(timestamp)
          FROM "StatusNotifications"
          WHERE charging_station_id = sn.charging_station_id
          AND connector_id = sn.connector_id
        )
      `;

      const [availableStats] = await this.repository.readOnlyDbConnection.query(availableQuery, {
        replacements: { tenantId },
        type: 'SELECT'
      });

      // Get all-time transaction stats
      const transactionQuery = `
        SELECT
          COUNT(DISTINCT t.id) as total_sessions,
          COALESCE(SUM(CAST(t.meter_stop - t.meter_start AS DECIMAL)) / 1000.0, 0) as total_energy_kwh,
          COALESCE(SUM(t.total_cost), 0) as total_revenue
        FROM "Transactions" t
        ${tenantFilter.replace('cs.', 't.').replace('WHERE', 'WHERE')}
      `;

      const [transactionStats] = await this.repository.readOnlyDbConnection.query(transactionQuery, {
        replacements: { tenantId },
        type: 'SELECT'
      });

      const summary = {
        totalStations: Number(stationStats.total_stations) || 0,
        activeStations: Number(stationStats.active_stations) || 0,
        totalConnectors: Number(stationStats.total_connectors) || 0,
        availableConnectors: Number(availableStats?.available_connectors) || 0,
        allTimeStats: {
          totalSessions: Number(transactionStats.total_sessions) || 0,
          totalEnergyKwh: Number(transactionStats.total_energy_kwh) || 0,
          totalRevenue: Number(transactionStats.total_revenue) || 0
        }
      };

      this.logger.info(
        `Network summary: ${summary.totalStations} stations, ${summary.allTimeStats.totalSessions} all-time sessions`
      );

      return summary;
    } catch (error) {
      this.logger.error('Failed to get network summary', error);
      throw error;
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private async getUsageData(
    startDate: Date,
    endDate: Date,
    tenantId?: string
  ): Promise<any[]> {
    const tenantFilter = tenantId ? 'AND tenant_id = :tenantId' : '';

    const query = `
      SELECT *
      FROM usage_snapshots
      WHERE snapshot_date >= :startDate
      AND snapshot_date <= :endDate
      ${tenantFilter}
      ORDER BY snapshot_date ASC
    `;

    return await this.repository.readOnlyDbConnection.query(query, {
      replacements: {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        tenantId
      },
      type: 'SELECT'
    });
  }

  private async calculateDailyMetrics(
    startDate: Date,
    endDate: Date,
    tenantId?: string
  ): Promise<{
    totalSessions: number;
    totalEnergyKwh: number;
    totalDurationMinutes: number;
    totalRevenue: number;
    uniqueUsers: number;
  }> {
    const tenantFilter = tenantId ? 'AND t.tenant_id = :tenantId' : '';

    const query = `
      SELECT
        COUNT(DISTINCT t.id) as total_sessions,
        COALESCE(SUM(CAST(t.meter_stop - t.meter_start AS DECIMAL)) / 1000.0, 0) as total_energy_kwh,
        COALESCE(SUM(EXTRACT(EPOCH FROM (t.time_end - t.time_start)) / 60), 0) as total_duration_minutes,
        COALESCE(SUM(t.total_cost), 0) as total_revenue,
        COUNT(DISTINCT t.id_tag) as unique_users
      FROM "Transactions" t
      WHERE t.time_start >= :startDate
      AND t.time_start <= :endDate
      ${tenantFilter}
    `;

    const [result] = await this.repository.readOnlyDbConnection.query(query, {
      replacements: { startDate, endDate, tenantId },
      type: 'SELECT'
    });

    return {
      totalSessions: Number(result.total_sessions) || 0,
      totalEnergyKwh: Number(result.total_energy_kwh) || 0,
      totalDurationMinutes: Number(result.total_duration_minutes) || 0,
      totalRevenue: Number(result.total_revenue) || 0,
      uniqueUsers: Number(result.unique_users) || 0
    };
  }

  private sumField(data: any[], field: string): number {
    if (!data || data.length === 0) return 0;
    return data.reduce((acc, item) => acc + (Number(item[field]) || 0), 0);
  }

  private calculatePercentChange(previous: number, current: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  }
}

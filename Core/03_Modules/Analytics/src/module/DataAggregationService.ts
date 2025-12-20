/**
 * Data Aggregation Service
 *
 * Handles time-series data aggregation for charts and visualizations
 * No external API keys required
 *
 * Provides:
 * - Hourly/daily/weekly/monthly aggregation
 * - Multi-metric aggregation (sessions, energy, revenue)
 * - Station-level and network-level aggregations
 * - Optimized for charting libraries
 */

import { ILogger } from '@citrineos/base';
import { SequelizeRepository } from '@citrineos/data';
import {
  startOfDay,
  startOfHour,
  startOfWeek,
  startOfMonth,
  endOfDay,
  endOfHour,
  endOfWeek,
  endOfMonth,
  addDays,
  addHours,
  addWeeks,
  addMonths,
  format
} from 'date-fns';

export type AggregationPeriod = 'hour' | 'day' | 'week' | 'month';

export interface AggregatedDataPoint {
  timestamp: Date;
  label: string;
  sessions: number;
  energyKwh: number;
  revenue: number;
  avgSessionDuration?: number;
  uniqueUsers?: number;
}

export interface MultiSeriesData {
  labels: string[];
  datasets: {
    sessions: number[];
    energyKwh: number[];
    revenue: number[];
  };
}

export class DataAggregationService {
  private readonly logger: ILogger;
  private readonly repository: SequelizeRepository;

  constructor(logger: ILogger, repository: SequelizeRepository) {
    this.logger = logger;
    this.repository = repository;
  }

  /**
   * Aggregate transaction data by time period
   *
   * @param startDate Start of period
   * @param endDate End of period
   * @param period Aggregation period (hour, day, week, month)
   * @param tenantId Optional tenant filter
   * @param stationId Optional station filter
   * @returns Array of aggregated data points
   */
  async aggregateByPeriod(
    startDate: Date,
    endDate: Date,
    period: AggregationPeriod,
    tenantId?: string,
    stationId?: string
  ): Promise<AggregatedDataPoint[]> {
    try {
      this.logger.info(
        `Aggregating data by ${period} from ${startDate.toISOString()} to ${endDate.toISOString()}`
      );

      const intervals = this.generateIntervals(startDate, endDate, period);
      const dataPoints: AggregatedDataPoint[] = [];

      for (const interval of intervals) {
        const metrics = await this.getMetricsForInterval(
          interval.start,
          interval.end,
          tenantId,
          stationId
        );

        dataPoints.push({
          timestamp: interval.start,
          label: interval.label,
          sessions: metrics.sessions,
          energyKwh: metrics.energyKwh,
          revenue: metrics.revenue,
          avgSessionDuration: metrics.avgSessionDuration,
          uniqueUsers: metrics.uniqueUsers
        });
      }

      this.logger.info(`Generated ${dataPoints.length} aggregated data points`);
      return dataPoints;
    } catch (error) {
      this.logger.error('Failed to aggregate data by period', error);
      throw error;
    }
  }

  /**
   * Get multi-series chart data (optimized for Chart.js, Recharts, etc.)
   *
   * @param startDate Start of period
   * @param endDate End of period
   * @param period Aggregation period
   * @param tenantId Optional tenant filter
   * @returns Chart-ready data structure
   */
  async getChartData(
    startDate: Date,
    endDate: Date,
    period: AggregationPeriod,
    tenantId?: string
  ): Promise<MultiSeriesData> {
    try {
      const dataPoints = await this.aggregateByPeriod(
        startDate,
        endDate,
        period,
        tenantId
      );

      const chartData: MultiSeriesData = {
        labels: dataPoints.map(d => d.label),
        datasets: {
          sessions: dataPoints.map(d => d.sessions),
          energyKwh: dataPoints.map(d => d.energyKwh),
          revenue: dataPoints.map(d => d.revenue)
        }
      };

      this.logger.info(
        `Generated chart data with ${chartData.labels.length} data points`
      );

      return chartData;
    } catch (error) {
      this.logger.error('Failed to get chart data', error);
      throw error;
    }
  }

  /**
   * Compare two periods side-by-side
   *
   * @param period1Start First period start
   * @param period1End First period end
   * @param period2Start Second period start
   * @param period2End Second period end
   * @param aggregation Aggregation period
   * @param tenantId Optional tenant filter
   * @returns Comparison data for both periods
   */
  async comparePeriods(
    period1Start: Date,
    period1End: Date,
    period2Start: Date,
    period2End: Date,
    aggregation: AggregationPeriod,
    tenantId?: string
  ): Promise<{
    period1: AggregatedDataPoint[];
    period2: AggregatedDataPoint[];
    comparison: {
      sessionsChange: number;
      energyChange: number;
      revenueChange: number;
    };
  }> {
    try {
      const [period1Data, period2Data] = await Promise.all([
        this.aggregateByPeriod(period1Start, period1End, aggregation, tenantId),
        this.aggregateByPeriod(period2Start, period2End, aggregation, tenantId)
      ]);

      const period1Totals = this.sumDataPoints(period1Data);
      const period2Totals = this.sumDataPoints(period2Data);

      const comparison = {
        sessionsChange: this.calculatePercentChange(
          period2Totals.sessions,
          period1Totals.sessions
        ),
        energyChange: this.calculatePercentChange(
          period2Totals.energyKwh,
          period1Totals.energyKwh
        ),
        revenueChange: this.calculatePercentChange(
          period2Totals.revenue,
          period1Totals.revenue
        )
      };

      this.logger.info(
        `Period comparison: Sessions ${comparison.sessionsChange.toFixed(1)}%, ` +
        `Energy ${comparison.energyChange.toFixed(1)}%, ` +
        `Revenue ${comparison.revenueChange.toFixed(1)}%`
      );

      return {
        period1: period1Data,
        period2: period2Data,
        comparison
      };
    } catch (error) {
      this.logger.error('Failed to compare periods', error);
      throw error;
    }
  }

  /**
   * Get hourly breakdown for a specific day
   *
   * @param date Date to analyze
   * @param tenantId Optional tenant filter
   * @param stationId Optional station filter
   * @returns 24 data points (one per hour)
   */
  async getHourlyBreakdown(
    date: Date,
    tenantId?: string,
    stationId?: string
  ): Promise<AggregatedDataPoint[]> {
    const dayStart = startOfDay(date);
    const dayEnd = endOfDay(date);

    return await this.aggregateByPeriod(
      dayStart,
      dayEnd,
      'hour',
      tenantId,
      stationId
    );
  }

  /**
   * Get weekly summary for the last N weeks
   *
   * @param weeks Number of weeks to analyze
   * @param tenantId Optional tenant filter
   * @returns Weekly aggregated data
   */
  async getWeeklySummary(
    weeks: number = 4,
    tenantId?: string
  ): Promise<AggregatedDataPoint[]> {
    const endDate = new Date();
    const startDate = addWeeks(endDate, -weeks);

    return await this.aggregateByPeriod(
      startDate,
      endDate,
      'week',
      tenantId
    );
  }

  /**
   * Get monthly summary for the last N months
   *
   * @param months Number of months to analyze
   * @param tenantId Optional tenant filter
   * @returns Monthly aggregated data
   */
  async getMonthlySummary(
    months: number = 12,
    tenantId?: string
  ): Promise<AggregatedDataPoint[]> {
    const endDate = new Date();
    const startDate = addMonths(endDate, -months);

    return await this.aggregateByPeriod(
      startDate,
      endDate,
      'month',
      tenantId
    );
  }

  /**
   * Get real-time dashboard sparkline data (last 24 hours, hourly)
   *
   * @param tenantId Optional tenant filter
   * @returns Last 24 hours of hourly data
   */
  async getSparklineData(tenantId?: string): Promise<{
    sessions: number[];
    energyKwh: number[];
    revenue: number[];
  }> {
    try {
      const endDate = new Date();
      const startDate = addHours(endDate, -24);

      const dataPoints = await this.aggregateByPeriod(
        startDate,
        endDate,
        'hour',
        tenantId
      );

      return {
        sessions: dataPoints.map(d => d.sessions),
        energyKwh: dataPoints.map(d => d.energyKwh),
        revenue: dataPoints.map(d => d.revenue)
      };
    } catch (error) {
      this.logger.error('Failed to get sparkline data', error);
      return { sessions: [], energyKwh: [], revenue: [] };
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private generateIntervals(
    startDate: Date,
    endDate: Date,
    period: AggregationPeriod
  ): Array<{ start: Date; end: Date; label: string }> {
    const intervals: Array<{ start: Date; end: Date; label: string }> = [];
    let current = this.getStartOfPeriod(startDate, period);
    const end = this.getEndOfPeriod(endDate, period);

    while (current <= end) {
      const intervalStart = current;
      const intervalEnd = this.getEndOfPeriod(current, period);
      const label = this.formatLabel(intervalStart, period);

      intervals.push({
        start: intervalStart,
        end: intervalEnd,
        label
      });

      current = this.addPeriod(intervalStart, period);
    }

    return intervals;
  }

  private getStartOfPeriod(date: Date, period: AggregationPeriod): Date {
    switch (period) {
      case 'hour':
        return startOfHour(date);
      case 'day':
        return startOfDay(date);
      case 'week':
        return startOfWeek(date, { weekStartsOn: 1 }); // Monday
      case 'month':
        return startOfMonth(date);
    }
  }

  private getEndOfPeriod(date: Date, period: AggregationPeriod): Date {
    switch (period) {
      case 'hour':
        return endOfHour(date);
      case 'day':
        return endOfDay(date);
      case 'week':
        return endOfWeek(date, { weekStartsOn: 1 }); // Monday
      case 'month':
        return endOfMonth(date);
    }
  }

  private addPeriod(date: Date, period: AggregationPeriod): Date {
    switch (period) {
      case 'hour':
        return addHours(date, 1);
      case 'day':
        return addDays(date, 1);
      case 'week':
        return addWeeks(date, 1);
      case 'month':
        return addMonths(date, 1);
    }
  }

  private formatLabel(date: Date, period: AggregationPeriod): string {
    switch (period) {
      case 'hour':
        return format(date, 'HH:mm');
      case 'day':
        return format(date, 'MMM dd');
      case 'week':
        return format(date, 'MMM dd');
      case 'month':
        return format(date, 'MMM yyyy');
    }
  }

  private async getMetricsForInterval(
    startDate: Date,
    endDate: Date,
    tenantId?: string,
    stationId?: string
  ): Promise<{
    sessions: number;
    energyKwh: number;
    revenue: number;
    avgSessionDuration: number;
    uniqueUsers: number;
  }> {
    const filters: string[] = [];
    const replacements: any = { startDate, endDate };

    if (tenantId) {
      filters.push('t.tenant_id = :tenantId');
      replacements.tenantId = tenantId;
    }

    if (stationId) {
      filters.push('t.charging_station_id = :stationId');
      replacements.stationId = stationId;
    }

    const whereClause = filters.length > 0 ? `AND ${filters.join(' AND ')}` : '';

    const query = `
      SELECT
        COUNT(DISTINCT t.id) as sessions,
        COALESCE(SUM(CAST(t.meter_stop - t.meter_start AS DECIMAL)) / 1000.0, 0) as energy_kwh,
        COALESCE(SUM(t.total_cost), 0) as revenue,
        COALESCE(AVG(EXTRACT(EPOCH FROM (t.time_end - t.time_start)) / 60), 0) as avg_duration,
        COUNT(DISTINCT t.id_tag) as unique_users
      FROM "Transactions" t
      WHERE t.time_start >= :startDate
      AND t.time_start <= :endDate
      ${whereClause}
    `;

    const [result] = await this.repository.readOnlyDbConnection.query(query, {
      replacements,
      type: 'SELECT'
    });

    return {
      sessions: Number(result.sessions) || 0,
      energyKwh: Number(result.energy_kwh) || 0,
      revenue: Number(result.revenue) || 0,
      avgSessionDuration: Number(result.avg_duration) || 0,
      uniqueUsers: Number(result.unique_users) || 0
    };
  }

  private sumDataPoints(dataPoints: AggregatedDataPoint[]): {
    sessions: number;
    energyKwh: number;
    revenue: number;
  } {
    return dataPoints.reduce(
      (acc, point) => ({
        sessions: acc.sessions + point.sessions,
        energyKwh: acc.energyKwh + point.energyKwh,
        revenue: acc.revenue + point.revenue
      }),
      { sessions: 0, energyKwh: 0, revenue: 0 }
    );
  }

  private calculatePercentChange(previous: number, current: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  }
}

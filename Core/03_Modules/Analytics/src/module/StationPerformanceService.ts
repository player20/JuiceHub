/**
 * Station Performance Service
 *
 * Calculates station health scores and performance metrics
 * No external API keys required
 *
 * Health Score Algorithm (0-100):
 * - Uptime: 40% weight
 * - Success Rate: 30% weight
 * - Error Rate: 20% weight
 * - Avg Session Duration: 10% weight
 */

import { ILogger } from '@citrineos/base';
import { SequelizeRepository } from '@citrineos/data';
import {
  AnalyticsConfig,
  DEFAULT_ANALYTICS_CONFIG,
  HealthScoreFactors,
  StationHealthScore,
  StationPerformanceDaily,
  StationPerformanceSummary
} from './interfaces';
import { subDays, startOfDay, endOfDay } from 'date-fns';

export class StationPerformanceService {
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
   * Calculate health score for a charging station
   *
   * @param stationId Charging station ID
   * @param periodDays Number of days to analyze (default: 7)
   * @returns Health score with detailed factors
   */
  async calculateHealthScore(
    stationId: string,
    periodDays: number = 7
  ): Promise<StationHealthScore> {
    try {
      const endDate = new Date();
      const startDate = subDays(endDate, periodDays);

      // Get station performance data for period
      const performanceData = await this.getStationPerformanceData(
        stationId,
        startDate,
        endDate
      );

      if (!performanceData || performanceData.length === 0) {
        this.logger.warn(`No performance data found for station ${stationId}`);
        return this.getDefaultHealthScore(stationId);
      }

      // Calculate average metrics
      const avgUptime = this.calculateAverage(performanceData, 'uptimePercentage');
      const totalSessions = this.sumField(performanceData, 'totalSessions');
      const successfulSessions = this.sumField(performanceData, 'successfulSessions');
      const failedSessions = this.sumField(performanceData, 'failedSessions');
      const avgDuration = this.calculateAverage(performanceData, 'avgSessionDurationMinutes');

      // Calculate individual factor scores
      const factors: HealthScoreFactors = {
        uptime: avgUptime,
        successRate: totalSessions > 0 ? (successfulSessions / totalSessions) * 100 : 0,
        errorRate: totalSessions > 0 ? 100 - ((failedSessions / totalSessions) * 100) : 100,
        avgDuration: this.normalizeDurationScore(avgDuration)
      };

      // Calculate weighted health score
      const healthScore = this.calculateWeightedScore(factors);

      // Determine status and trend
      const status = this.getHealthStatus(healthScore);
      const trend = await this.calculateTrend(stationId, healthScore);

      const result: StationHealthScore = {
        chargingStationId: stationId,
        healthScore: Math.round(healthScore),
        factors,
        status,
        trend,
        lastCalculated: new Date()
      };

      this.logger.info(
        `Calculated health score for station ${stationId}: ${healthScore.toFixed(1)} (${status})`
      );

      return result;
    } catch (error) {
      this.logger.error(`Failed to calculate health score for station ${stationId}`, error);
      return this.getDefaultHealthScore(stationId);
    }
  }

  /**
   * Calculate health scores for multiple stations
   *
   * @param stationIds Array of station IDs
   * @param periodDays Number of days to analyze
   * @returns Array of health scores
   */
  async calculateHealthScores(
    stationIds: string[],
    periodDays: number = 7
  ): Promise<StationHealthScore[]> {
    const scores = await Promise.all(
      stationIds.map(id => this.calculateHealthScore(id, periodDays))
    );

    // Sort by health score (lowest first for attention)
    return scores.sort((a, b) => a.healthScore - b.healthScore);
  }

  /**
   * Get low-performing stations (below threshold)
   *
   * @param threshold Health score threshold (default: 70)
   * @param periodDays Number of days to analyze
   * @returns Array of low-performing stations
   */
  async getLowPerformingStations(
    threshold: number = 70,
    periodDays: number = 7,
    tenantId?: string
  ): Promise<StationHealthScore[]> {
    try {
      // Get all active stations
      const stations = await this.getAllActiveStations(tenantId);
      const stationIds = stations.map(s => s.id);

      // Calculate health scores
      const scores = await this.calculateHealthScores(stationIds, periodDays);

      // Filter by threshold
      const lowPerforming = scores.filter(s => s.healthScore < threshold);

      this.logger.info(
        `Found ${lowPerforming.length} low-performing stations (threshold: ${threshold})`
      );

      return lowPerforming;
    } catch (error) {
      this.logger.error('Failed to get low-performing stations', error);
      return [];
    }
  }

  /**
   * Save daily performance snapshot
   *
   * @param stationId Charging station ID
   * @param date Date for snapshot
   */
  async saveDailyPerformance(stationId: string, date: Date = new Date()): Promise<void> {
    try {
      const startDate = startOfDay(date);
      const endDate = endOfDay(date);

      // Calculate daily metrics
      const metrics = await this.calculateDailyMetrics(stationId, startDate, endDate);

      // Calculate health score
      const healthScore = await this.calculateHealthScore(stationId, 1);

      // Save to database
      const performanceData: Partial<StationPerformanceDaily> = {
        chargingStationId: stationId,
        date: startDate,
        uptimePercentage: metrics.uptimePercentage,
        totalSessions: metrics.totalSessions,
        successfulSessions: metrics.successfulSessions,
        failedSessions: metrics.failedSessions,
        totalEnergyKwh: metrics.totalEnergyKwh,
        totalRevenue: metrics.totalRevenue,
        healthScore: healthScore.healthScore,
        avgSessionDurationMinutes: metrics.avgSessionDurationMinutes,
        createdAt: new Date()
      };

      await this.repository.readOnlyDbConnection.models.station_performance_daily.upsert(
        performanceData,
        { conflictFields: ['charging_station_id', 'date'] }
      );

      this.logger.info(
        `Saved daily performance for station ${stationId} on ${date.toISOString().split('T')[0]}`
      );
    } catch (error) {
      this.logger.error(
        `Failed to save daily performance for station ${stationId}`,
        error
      );
    }
  }

  /**
   * Get performance summary for a station
   *
   * @param stationId Charging station ID
   * @param startDate Start of period
   * @param endDate End of period
   * @returns Performance summary
   */
  async getPerformanceSummary(
    stationId: string,
    startDate: Date,
    endDate: Date
  ): Promise<StationPerformanceSummary> {
    try {
      const performanceData = await this.getStationPerformanceData(
        stationId,
        startDate,
        endDate
      );

      const avgUptime = this.calculateAverage(performanceData, 'uptimePercentage');
      const totalSessions = this.sumField(performanceData, 'totalSessions');
      const successfulSessions = this.sumField(performanceData, 'successfulSessions');
      const totalEnergy = this.sumField(performanceData, 'totalEnergyKwh');
      const totalRevenue = this.sumField(performanceData, 'totalRevenue');
      const avgHealth = this.calculateAverage(performanceData, 'healthScore');

      const successRate = totalSessions > 0 ? (successfulSessions / totalSessions) * 100 : 0;

      // Calculate trend
      const midpoint = new Date((startDate.getTime() + endDate.getTime()) / 2);
      const firstHalf = performanceData.filter(d => new Date(d.date) < midpoint);
      const secondHalf = performanceData.filter(d => new Date(d.date) >= midpoint);

      const firstHalfHealth = this.calculateAverage(firstHalf, 'healthScore');
      const secondHalfHealth = this.calculateAverage(secondHalf, 'healthScore');

      let healthTrend: 'improving' | 'stable' | 'declining';
      if (secondHalfHealth > firstHalfHealth + 5) {
        healthTrend = 'improving';
      } else if (secondHalfHealth < firstHalfHealth - 5) {
        healthTrend = 'declining';
      } else {
        healthTrend = 'stable';
      }

      return {
        chargingStationId: stationId,
        period: { start: startDate, end: endDate },
        avgUptimePercentage: avgUptime,
        totalSessions,
        successRate,
        totalEnergyKwh: totalEnergy,
        totalRevenue,
        avgHealthScore: avgHealth,
        healthTrend
      };
    } catch (error) {
      this.logger.error(`Failed to get performance summary for station ${stationId}`, error);
      throw error;
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private calculateWeightedScore(factors: HealthScoreFactors): number {
    const weights = this.config.healthScoreWeights;

    return (
      factors.uptime * weights.uptime +
      factors.successRate * weights.successRate +
      factors.errorRate * weights.errorRate +
      factors.avgDuration * weights.avgDuration
    );
  }

  private getHealthStatus(
    score: number
  ): 'excellent' | 'good' | 'fair' | 'poor' | 'critical' {
    const thresholds = this.config.thresholds;

    if (score >= thresholds.excellentHealth) return 'excellent';
    if (score >= thresholds.goodHealth) return 'good';
    if (score >= thresholds.fairHealth) return 'fair';
    if (score >= thresholds.poorHealth) return 'poor';
    return 'critical';
  }

  private async calculateTrend(
    stationId: string,
    currentScore: number
  ): Promise<'improving' | 'stable' | 'declining'> {
    try {
      const daysAgo = this.config.trendsWindow.daysForComparison;
      const previousScore = await this.calculateHealthScore(stationId, daysAgo);

      const diff = currentScore - previousScore.healthScore;

      if (diff > 5) return 'improving';
      if (diff < -5) return 'declining';
      return 'stable';
    } catch (error) {
      return 'stable';
    }
  }

  private normalizeDurationScore(avgDuration: number): number {
    // Assuming network average is 60 minutes
    const networkAverage = 60;

    if (avgDuration === 0) return 0;

    // Score is better when closer to network average
    const ratio = avgDuration / networkAverage;
    const score = ratio <= 1 ? ratio * 100 : 100 / ratio;

    return Math.min(100, Math.max(0, score));
  }

  private calculateAverage(data: any[], field: string): number {
    if (!data || data.length === 0) return 0;

    const sum = data.reduce((acc, item) => acc + (Number(item[field]) || 0), 0);
    return sum / data.length;
  }

  private sumField(data: any[], field: string): number {
    if (!data || data.length === 0) return 0;

    return data.reduce((acc, item) => acc + (Number(item[field]) || 0), 0);
  }

  private getDefaultHealthScore(stationId: string): StationHealthScore {
    return {
      chargingStationId: stationId,
      healthScore: 0,
      factors: {
        uptime: 0,
        successRate: 0,
        errorRate: 0,
        avgDuration: 0
      },
      status: 'critical',
      trend: 'stable',
      lastCalculated: new Date()
    };
  }

  private async getStationPerformanceData(
    stationId: string,
    startDate: Date,
    endDate: Date
  ): Promise<any[]> {
    // Query station_performance_daily table
    const result = await this.repository.readOnlyDbConnection.query(
      `SELECT * FROM station_performance_daily
       WHERE charging_station_id = :stationId
       AND date >= :startDate
       AND date <= :endDate
       ORDER BY date ASC`,
      {
        replacements: {
          stationId,
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0]
        },
        type: 'SELECT'
      }
    );

    return result;
  }

  private async calculateDailyMetrics(
    stationId: string,
    startDate: Date,
    endDate: Date
  ): Promise<any> {
    // Calculate metrics from transactions and status notifications
    const query = `
      SELECT
        COUNT(DISTINCT t.id) as total_sessions,
        COUNT(DISTINCT CASE WHEN t.stop_reason = 'EVDisconnected' OR t.stop_reason = 'Normal' THEN t.id END) as successful_sessions,
        COUNT(DISTINCT CASE WHEN t.stop_reason LIKE '%Error%' OR t.stop_reason LIKE '%Fault%' THEN t.id END) as failed_sessions,
        COALESCE(SUM(CAST(t.meter_stop - t.meter_start AS DECIMAL)) / 1000.0, 0) as total_energy_kwh,
        COALESCE(SUM(t.total_cost), 0) as total_revenue,
        COALESCE(AVG(EXTRACT(EPOCH FROM (t.time_end - t.time_start)) / 60), 0) as avg_session_duration_minutes
      FROM "Transactions" t
      WHERE t.charging_station_id = :stationId
      AND t.time_start >= :startDate
      AND t.time_start <= :endDate
    `;

    const [metrics] = await this.repository.readOnlyDbConnection.query(query, {
      replacements: { stationId, startDate, endDate },
      type: 'SELECT'
    });

    // Calculate uptime from status notifications
    const uptimeQuery = `
      SELECT
        COUNT(DISTINCT CASE WHEN connector_status = 'Available' OR connector_status = 'Charging' THEN timestamp END)::FLOAT /
        NULLIF(COUNT(DISTINCT timestamp)::FLOAT, 0) * 100 as uptime_percentage
      FROM "StatusNotifications"
      WHERE charging_station_id = :stationId
      AND timestamp >= :startDate
      AND timestamp <= :endDate
    `;

    const [uptime] = await this.repository.readOnlyDbConnection.query(uptimeQuery, {
      replacements: { stationId, startDate, endDate },
      type: 'SELECT'
    });

    return {
      ...metrics,
      uptimePercentage: uptime?.uptime_percentage || 0
    };
  }

  private async getAllActiveStations(tenantId?: string): Promise<any[]> {
    const whereClause = tenantId ? 'WHERE tenant_id = :tenantId' : '';

    const query = `
      SELECT id, station_id as name
      FROM "ChargingStations"
      ${whereClause}
      ORDER BY id
    `;

    return await this.repository.readOnlyDbConnection.query(query, {
      replacements: { tenantId },
      type: 'SELECT'
    });
  }
}

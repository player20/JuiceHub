/**
 * Analytics Module
 *
 * Main module that wires together all analytics services
 * Provides unified interface for usage tracking, performance monitoring, and reporting
 *
 * No external API keys required - uses only database data
 */

import { ILogger } from '@citrineos/base';
import { SequelizeRepository } from '@citrineos/data';
import { ExportService, createExportService } from '@citrineos/util';
import {
  AnalyticsConfig,
  DEFAULT_ANALYTICS_CONFIG
} from './module/interfaces';
import { UsageAnalyticsService } from './module/UsageAnalyticsService';
import { StationPerformanceService } from './module/StationPerformanceService';
import { DataAggregationService } from './module/DataAggregationService';
import { ReportGeneratorService } from './module/ReportGeneratorService';

/**
 * Analytics Module
 *
 * Provides comprehensive analytics capabilities:
 * - Usage tracking and metrics
 * - Station health scores and performance monitoring
 * - Time-series data aggregation for charts
 * - Report generation (usage, performance, revenue)
 * - Data export (CSV, JSON)
 */
export class AnalyticsModule {
  private readonly logger: ILogger;
  private readonly repository: SequelizeRepository;
  private readonly config: AnalyticsConfig;

  public readonly usage: UsageAnalyticsService;
  public readonly performance: StationPerformanceService;
  public readonly aggregation: DataAggregationService;
  public readonly reports: ReportGeneratorService;
  public readonly export: ExportService;

  constructor(
    logger: ILogger,
    repository: SequelizeRepository,
    config: AnalyticsConfig = DEFAULT_ANALYTICS_CONFIG
  ) {
    this.logger = logger;
    this.repository = repository;
    this.config = config;

    // Initialize export service
    this.export = createExportService(logger);

    // Initialize analytics services
    this.usage = new UsageAnalyticsService(logger, repository, config);
    this.performance = new StationPerformanceService(logger, repository, config);
    this.aggregation = new DataAggregationService(logger, repository);
    this.reports = new ReportGeneratorService(logger, repository, this.export, config);

    this.logger.info('Analytics Module initialized successfully');
  }

  /**
   * Run daily aggregation jobs
   *
   * Should be scheduled to run daily (e.g., via cron job)
   * Aggregates usage and performance data for all tenants
   */
  async runDailyAggregation(): Promise<void> {
    try {
      this.logger.info('Starting daily analytics aggregation...');

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      // Save daily usage snapshot
      await this.usage.saveDailySnapshot(yesterday);

      // Get all active stations and save their daily performance
      const stations = await this.getAllActiveStations();
      this.logger.info(`Processing ${stations.length} stations for daily performance snapshots`);

      for (const station of stations) {
        try {
          await this.performance.saveDailyPerformance(station.id, yesterday);
        } catch (error) {
          this.logger.error(
            `Failed to save daily performance for station ${station.id}`,
            error
          );
          // Continue with other stations
        }
      }

      this.logger.info('Daily analytics aggregation completed successfully');
    } catch (error) {
      this.logger.error('Failed to run daily aggregation', error);
      throw error;
    }
  }

  /**
   * Get dashboard summary data
   *
   * Optimized method for dashboard overview page
   * Returns quick stats, trends, and alerts
   */
  async getDashboardSummary(tenantId?: string): Promise<{
    quickStats: Awaited<ReturnType<typeof this.usage.getQuickStats>>;
    networkSummary: Awaited<ReturnType<typeof this.usage.getNetworkSummary>>;
    lowPerformingStations: Awaited<ReturnType<typeof this.performance.getLowPerformingStations>>;
    topStations: Awaited<ReturnType<typeof this.usage.getTopStations>>;
  }> {
    try {
      this.logger.info('Fetching dashboard summary data...');

      const now = new Date();
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const [quickStats, networkSummary, lowPerformingStations, topStations] =
        await Promise.all([
          this.usage.getQuickStats(tenantId),
          this.usage.getNetworkSummary(tenantId),
          this.performance.getLowPerformingStations(70, 7, tenantId),
          this.usage.getTopStations('revenue', 5, sevenDaysAgo, now, tenantId)
        ]);

      this.logger.info('Dashboard summary data retrieved successfully');

      return {
        quickStats,
        networkSummary,
        lowPerformingStations,
        topStations
      };
    } catch (error) {
      this.logger.error('Failed to get dashboard summary', error);
      throw error;
    }
  }

  /**
   * Health check for analytics module
   *
   * Verifies database connectivity and data availability
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    databaseConnected: boolean;
    latestSnapshot?: Date;
    message: string;
  }> {
    try {
      // Test database connection
      await this.repository.readOnlyDbConnection.query('SELECT 1', {
        type: 'SELECT'
      });

      // Check for recent usage snapshots
      const result = await this.repository.readOnlyDbConnection.query(
        'SELECT MAX(snapshot_date) as latest FROM usage_snapshots',
        { type: 'SELECT' }
      );

      const latestSnapshot = result[0]?.latest ? new Date(result[0].latest) : undefined;

      return {
        healthy: true,
        databaseConnected: true,
        latestSnapshot,
        message: 'Analytics module is healthy'
      };
    } catch (error) {
      this.logger.error('Analytics module health check failed', error);
      return {
        healthy: false,
        databaseConnected: false,
        message: `Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private async getAllActiveStations(): Promise<any[]> {
    const query = `
      SELECT id, station_id as name
      FROM "ChargingStations"
      WHERE registration_status = 'Accepted'
      ORDER BY id
    `;

    return await this.repository.readOnlyDbConnection.query(query, {
      type: 'SELECT'
    });
  }
}

/**
 * Factory function to create Analytics Module instance
 */
export function createAnalyticsModule(
  logger: ILogger,
  repository: SequelizeRepository,
  config?: AnalyticsConfig
): AnalyticsModule {
  return new AnalyticsModule(logger, repository, config);
}

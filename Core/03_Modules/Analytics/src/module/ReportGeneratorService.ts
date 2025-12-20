/**
 * Report Generator Service
 *
 * Generates comprehensive usage, performance, and revenue reports
 * No external API keys required
 *
 * Provides:
 * - Usage reports with trends
 * - Performance reports with health scores
 * - Revenue reports with breakdowns
 * - Export to JSON/CSV formats
 */

import { ILogger } from '@citrineos/base';
import { SequelizeRepository } from '@citrineos/data';
import { ExportService } from '@citrineos/util';
import {
  AnalyticsConfig,
  DEFAULT_ANALYTICS_CONFIG,
  UsageReport,
  PerformanceReport,
  RevenueReport,
  ReportOptions
} from './interfaces';
import { UsageAnalyticsService } from './UsageAnalyticsService';
import { StationPerformanceService } from './StationPerformanceService';
import { format } from 'date-fns';

export class ReportGeneratorService {
  private readonly logger: ILogger;
  private readonly repository: SequelizeRepository;
  private readonly config: AnalyticsConfig;
  private readonly usageService: UsageAnalyticsService;
  private readonly performanceService: StationPerformanceService;
  private readonly exportService: ExportService;

  constructor(
    logger: ILogger,
    repository: SequelizeRepository,
    exportService: ExportService,
    config: AnalyticsConfig = DEFAULT_ANALYTICS_CONFIG
  ) {
    this.logger = logger;
    this.repository = repository;
    this.config = config;
    this.exportService = exportService;
    this.usageService = new UsageAnalyticsService(logger, repository, config);
    this.performanceService = new StationPerformanceService(logger, repository, config);
  }

  /**
   * Generate comprehensive usage report
   *
   * @param options Report options (dates, filters, format)
   * @returns Usage report with metrics and trends
   */
  async generateUsageReport(options: ReportOptions): Promise<UsageReport> {
    try {
      this.logger.info(
        `Generating usage report from ${options.startDate.toISOString()} to ${options.endDate.toISOString()}`
      );

      // Get usage metrics with trends
      const summary = await this.usageService.getUsageMetrics(
        options.startDate,
        options.endDate,
        options.tenantId
      );

      // Get daily breakdown
      const dailyBreakdown = await this.usageService.getUsageTrends(
        options.startDate,
        options.endDate,
        options.tenantId
      );

      // Get top performing stations
      const topStations = await this.usageService.getTopStations(
        'revenue',
        10,
        options.startDate,
        options.endDate,
        options.tenantId
      );

      const report: UsageReport = {
        title: `Usage Report - ${format(options.startDate, 'MMM dd, yyyy')} to ${format(options.endDate, 'MMM dd, yyyy')}`,
        generatedAt: new Date(),
        period: {
          start: options.startDate,
          end: options.endDate
        },
        summary,
        dailyBreakdown,
        topStations
      };

      this.logger.info(
        `Usage report generated: ${summary.totalSessions} sessions, $${summary.totalRevenue.toFixed(2)} revenue`
      );

      // Export if format specified
      if (options.format) {
        await this.exportReport(report, 'usage', options.format);
      }

      return report;
    } catch (error) {
      this.logger.error('Failed to generate usage report', error);
      throw error;
    }
  }

  /**
   * Generate performance report with health scores
   *
   * @param options Report options (dates, filters, format)
   * @returns Performance report with station health
   */
  async generatePerformanceReport(options: ReportOptions): Promise<PerformanceReport> {
    try {
      this.logger.info(
        `Generating performance report from ${options.startDate.toISOString()} to ${options.endDate.toISOString()}`
      );

      // Get all active stations
      const stations = await this.getAllActiveStations(
        options.tenantId,
        options.stationIds
      );

      if (stations.length === 0) {
        this.logger.warn('No stations found for performance report');
        return this.getEmptyPerformanceReport(options);
      }

      const stationIds = stations.map(s => s.id);

      // Calculate performance summaries
      const performanceSummaries = await Promise.all(
        stationIds.map(id =>
          this.performanceService.getPerformanceSummary(
            id,
            options.startDate,
            options.endDate
          )
        )
      );

      // Get low-performing stations
      const periodDays = Math.ceil(
        (options.endDate.getTime() - options.startDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      const lowPerforming = await this.performanceService.getLowPerformingStations(
        70,
        periodDays,
        options.tenantId
      );

      // Calculate overall health metrics
      const avgHealthScore = performanceSummaries.reduce(
        (sum, s) => sum + s.avgHealthScore,
        0
      ) / performanceSummaries.length;

      const avgUptime = performanceSummaries.reduce(
        (sum, s) => sum + s.avgUptimePercentage,
        0
      ) / performanceSummaries.length;

      const stationsOnline = performanceSummaries.filter(
        s => s.avgUptimePercentage >= 80
      ).length;

      const report: PerformanceReport = {
        title: `Performance Report - ${format(options.startDate, 'MMM dd, yyyy')} to ${format(options.endDate, 'MMM dd, yyyy')}`,
        generatedAt: new Date(),
        period: {
          start: options.startDate,
          end: options.endDate
        },
        overallHealth: {
          avgHealthScore: Math.round(avgHealthScore),
          stationsOnline,
          stationsTotal: stations.length,
          avgUptime: Math.round(avgUptime * 100) / 100
        },
        stations: performanceSummaries,
        lowPerformingStations: lowPerforming
      };

      this.logger.info(
        `Performance report generated: ${stationsOnline}/${stations.length} stations online, ` +
        `avg health ${avgHealthScore.toFixed(1)}`
      );

      // Export if format specified
      if (options.format) {
        await this.exportReport(report, 'performance', options.format);
      }

      return report;
    } catch (error) {
      this.logger.error('Failed to generate performance report', error);
      throw error;
    }
  }

  /**
   * Generate revenue report with breakdowns
   *
   * @param options Report options (dates, filters, format)
   * @returns Revenue report with daily and station breakdowns
   */
  async generateRevenueReport(options: ReportOptions): Promise<RevenueReport> {
    try {
      this.logger.info(
        `Generating revenue report from ${options.startDate.toISOString()} to ${options.endDate.toISOString()}`
      );

      // Get revenue by day
      const revenueByDay = await this.getRevenueByDay(
        options.startDate,
        options.endDate,
        options.tenantId
      );

      // Get revenue by station
      const revenueByStation = await this.getRevenueByStation(
        options.startDate,
        options.endDate,
        options.tenantId,
        options.stationIds
      );

      // Calculate totals
      const totalRevenue = revenueByDay.reduce((sum, d) => sum + d.revenue, 0);
      const totalSessions = revenueByDay.reduce((sum, d) => sum + d.sessions, 0);
      const avgRevenuePerSession = totalSessions > 0 ? totalRevenue / totalSessions : 0;

      // Get top revenue stations
      const topRevenueStations = [...revenueByStation]
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10)
        .map(s => ({
          stationId: s.stationId,
          stationName: s.stationName,
          revenue: s.revenue
        }));

      const report: RevenueReport = {
        title: `Revenue Report - ${format(options.startDate, 'MMM dd, yyyy')} to ${format(options.endDate, 'MMM dd, yyyy')}`,
        generatedAt: new Date(),
        period: {
          start: options.startDate,
          end: options.endDate
        },
        totalRevenue,
        totalSessions,
        avgRevenuePerSession,
        revenueByDay,
        revenueByStation,
        topRevenueStations
      };

      this.logger.info(
        `Revenue report generated: $${totalRevenue.toFixed(2)} from ${totalSessions} sessions`
      );

      // Export if format specified
      if (options.format) {
        await this.exportReport(report, 'revenue', options.format);
      }

      return report;
    } catch (error) {
      this.logger.error('Failed to generate revenue report', error);
      throw error;
    }
  }

  /**
   * Generate all reports in parallel
   *
   * @param options Report options
   * @returns All three report types
   */
  async generateAllReports(options: ReportOptions): Promise<{
    usage: UsageReport;
    performance: PerformanceReport;
    revenue: RevenueReport;
  }> {
    try {
      this.logger.info('Generating all reports...');

      const [usage, performance, revenue] = await Promise.all([
        this.generateUsageReport(options),
        this.generatePerformanceReport(options),
        this.generateRevenueReport(options)
      ]);

      this.logger.info('All reports generated successfully');

      return { usage, performance, revenue };
    } catch (error) {
      this.logger.error('Failed to generate all reports', error);
      throw error;
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private async exportReport(
    report: any,
    type: string,
    format: 'json' | 'csv' | 'pdf'
  ): Promise<void> {
    try {
      const timestamp = format === 'json'
        ? new Date().toISOString().replace(/[:.]/g, '-')
        : new Date().toISOString().split('T')[0];

      const filename = `${type}_report_${timestamp}`;

      switch (format) {
        case 'json':
          await this.exportService.exportToJSONFile(report, {
            filename: `${filename}.json`,
            pretty: true
          });
          this.logger.info(`Exported ${type} report to ${filename}.json`);
          break;

        case 'csv':
          // For CSV, export the main data array
          const dataToExport = this.extractReportData(report, type);
          await this.exportService.exportToCSVFile(dataToExport, {
            filename: `${filename}.csv`
          });
          this.logger.info(`Exported ${type} report to ${filename}.csv`);
          break;

        case 'pdf':
          this.logger.warn('PDF export not yet implemented - will be added with Revenue Module');
          break;
      }
    } catch (error) {
      this.logger.error(`Failed to export ${type} report as ${format}`, error);
      throw error;
    }
  }

  private extractReportData(report: any, type: string): any[] {
    switch (type) {
      case 'usage':
        return report.dailyBreakdown || [];
      case 'performance':
        return report.stations || [];
      case 'revenue':
        return report.revenueByStation || [];
      default:
        return [];
    }
  }

  private async getAllActiveStations(
    tenantId?: string,
    stationIds?: string[]
  ): Promise<any[]> {
    const filters: string[] = [];
    const replacements: any = {};

    if (tenantId) {
      filters.push('tenant_id = :tenantId');
      replacements.tenantId = tenantId;
    }

    if (stationIds && stationIds.length > 0) {
      filters.push('id = ANY(:stationIds)');
      replacements.stationIds = stationIds;
    }

    const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';

    const query = `
      SELECT id, station_id as name
      FROM "ChargingStations"
      ${whereClause}
      ORDER BY id
    `;

    return await this.repository.readOnlyDbConnection.query(query, {
      replacements,
      type: 'SELECT'
    });
  }

  private async getRevenueByDay(
    startDate: Date,
    endDate: Date,
    tenantId?: string
  ): Promise<Array<{ date: Date; revenue: number; sessions: number }>> {
    const tenantFilter = tenantId ? 'AND t.tenant_id = :tenantId' : '';

    const query = `
      SELECT
        DATE(t.time_start) as date,
        COALESCE(SUM(t.total_cost), 0) as revenue,
        COUNT(DISTINCT t.id) as sessions
      FROM "Transactions" t
      WHERE t.time_start >= :startDate
      AND t.time_start <= :endDate
      ${tenantFilter}
      GROUP BY DATE(t.time_start)
      ORDER BY date ASC
    `;

    const results = await this.repository.readOnlyDbConnection.query(query, {
      replacements: { startDate, endDate, tenantId },
      type: 'SELECT'
    });

    return results.map(row => ({
      date: new Date(row.date),
      revenue: Number(row.revenue) || 0,
      sessions: Number(row.sessions) || 0
    }));
  }

  private async getRevenueByStation(
    startDate: Date,
    endDate: Date,
    tenantId?: string,
    stationIds?: string[]
  ): Promise<Array<{
    stationId: string;
    stationName: string;
    revenue: number;
    sessions: number;
  }>> {
    const filters: string[] = [];
    const replacements: any = { startDate, endDate };

    if (tenantId) {
      filters.push('t.tenant_id = :tenantId');
      replacements.tenantId = tenantId;
    }

    if (stationIds && stationIds.length > 0) {
      filters.push('t.charging_station_id = ANY(:stationIds)');
      replacements.stationIds = stationIds;
    }

    const whereClause = filters.length > 0 ? `AND ${filters.join(' AND ')}` : '';

    const query = `
      SELECT
        cs.id as station_id,
        cs.station_id as station_name,
        COALESCE(SUM(t.total_cost), 0) as revenue,
        COUNT(DISTINCT t.id) as sessions
      FROM "Transactions" t
      INNER JOIN "ChargingStations" cs ON t.charging_station_id = cs.id
      WHERE t.time_start >= :startDate
      AND t.time_start <= :endDate
      ${whereClause}
      GROUP BY cs.id, cs.station_id
      ORDER BY revenue DESC
    `;

    const results = await this.repository.readOnlyDbConnection.query(query, {
      replacements,
      type: 'SELECT'
    });

    return results.map(row => ({
      stationId: row.station_id,
      stationName: row.station_name,
      revenue: Number(row.revenue) || 0,
      sessions: Number(row.sessions) || 0
    }));
  }

  private getEmptyPerformanceReport(options: ReportOptions): PerformanceReport {
    return {
      title: `Performance Report - ${format(options.startDate, 'MMM dd, yyyy')} to ${format(options.endDate, 'MMM dd, yyyy')}`,
      generatedAt: new Date(),
      period: {
        start: options.startDate,
        end: options.endDate
      },
      overallHealth: {
        avgHealthScore: 0,
        stationsOnline: 0,
        stationsTotal: 0,
        avgUptime: 0
      },
      stations: [],
      lowPerformingStations: []
    };
  }
}

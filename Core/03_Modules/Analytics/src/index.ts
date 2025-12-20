/**
 * Analytics Module - Public API
 *
 * Exports all public interfaces, services, and utilities
 */

// Main module
export { AnalyticsModule, createAnalyticsModule } from './module';

// Services
export { UsageAnalyticsService } from './module/UsageAnalyticsService';
export { StationPerformanceService } from './module/StationPerformanceService';
export { DataAggregationService } from './module/DataAggregationService';
export { ReportGeneratorService } from './module/ReportGeneratorService';

// Interfaces and types
export type {
  // Usage Analytics
  UsageSnapshot,
  UsageMetrics,
  UsageTrend,

  // Station Performance
  StationPerformanceDaily,
  HealthScoreFactors,
  StationHealthScore,
  StationPerformanceSummary,

  // Reports
  ReportOptions,
  UsageReport,
  PerformanceReport,
  RevenueReport,

  // Configuration
  AnalyticsConfig
} from './module/interfaces';

// Data aggregation types
export type {
  AggregationPeriod,
  AggregatedDataPoint,
  MultiSeriesData
} from './module/DataAggregationService';

// Default configuration
export { DEFAULT_ANALYTICS_CONFIG } from './module/interfaces';

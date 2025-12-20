/**
 * Analytics Module - TypeScript Interfaces
 *
 * Defines types for usage analytics, station performance, and reporting
 */

// ============================================================================
// USAGE ANALYTICS
// ============================================================================

export interface UsageSnapshot {
  id: string;
  tenantId?: string;
  snapshotDate: Date;
  totalSessions: number;
  totalEnergyKwh: number;
  totalDurationMinutes: number;
  totalRevenue: number;
  uniqueUsers: number;
  createdAt: Date;
}

export interface UsageMetrics {
  period: {
    start: Date;
    end: Date;
  };
  totalSessions: number;
  totalEnergyKwh: number;
  totalDurationMinutes: number;
  totalRevenue: number;
  uniqueUsers: number;
  avgSessionDurationMinutes: number;
  avgEnergyPerSession: number;
  avgRevenuePerSession: number;
  trend?: {
    sessions: number; // % change
    energy: number;
    revenue: number;
  };
}

export interface UsageTrend {
  date: Date;
  sessions: number;
  energyKwh: number;
  revenue: number;
  users: number;
}

// ============================================================================
// STATION PERFORMANCE & HEALTH
// ============================================================================

export interface StationPerformanceDaily {
  id: string;
  chargingStationId: string;
  date: Date;
  uptimePercentage: number;
  totalSessions: number;
  successfulSessions: number;
  failedSessions: number;
  totalEnergyKwh: number;
  totalRevenue: number;
  healthScore: number; // 0-100
  avgSessionDurationMinutes: number;
  createdAt: Date;
}

export interface HealthScoreFactors {
  uptime: number; // 0-100
  successRate: number; // 0-100
  errorRate: number; // 0-100 (inverted)
  avgDuration: number; // 0-100 (compared to network average)
}

export interface StationHealthScore {
  chargingStationId: string;
  stationName?: string;
  healthScore: number; // 0-100
  factors: HealthScoreFactors;
  status: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  trend: 'improving' | 'stable' | 'declining';
  lastCalculated: Date;
}

export interface StationPerformanceSummary {
  chargingStationId: string;
  stationName?: string;
  period: {
    start: Date;
    end: Date;
  };
  avgUptimePercentage: number;
  totalSessions: number;
  successRate: number;
  totalEnergyKwh: number;
  totalRevenue: number;
  avgHealthScore: number;
  healthTrend: 'improving' | 'stable' | 'declining';
}

// ============================================================================
// REPORTS
// ============================================================================

export interface ReportOptions {
  startDate: Date;
  endDate: Date;
  tenantId?: string;
  stationIds?: string[];
  locationIds?: string[];
  format?: 'json' | 'csv' | 'pdf';
  includeCharts?: boolean;
}

export interface UsageReport {
  title: string;
  generatedAt: Date;
  period: {
    start: Date;
    end: Date;
  };
  summary: UsageMetrics;
  dailyBreakdown: UsageTrend[];
  topStations?: Array<{
    stationId: string;
    stationName: string;
    sessions: number;
    energyKwh: number;
    revenue: number;
  }>;
}

export interface PerformanceReport {
  title: string;
  generatedAt: Date;
  period: {
    start: Date;
    end: Date;
  };
  overallHealth: {
    avgHealthScore: number;
    stationsOnline: number;
    stationsTotal: number;
    avgUptime: number;
  };
  stations: StationPerformanceSummary[];
  lowPerformingStations: StationHealthScore[];
}

export interface RevenueReport {
  title: string;
  generatedAt: Date;
  period: {
    start: Date;
    end: Date;
  };
  totalRevenue: number;
  totalSessions: number;
  avgRevenuePerSession: number;
  revenueByDay: Array<{
    date: Date;
    revenue: number;
    sessions: number;
  }>;
  revenueByStation: Array<{
    stationId: string;
    stationName: string;
    revenue: number;
    sessions: number;
  }>;
  topRevenueStations: Array<{
    stationId: string;
    stationName: string;
    revenue: number;
  }>;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

export interface AnalyticsConfig {
  healthScoreWeights: {
    uptime: number; // default: 0.4
    successRate: number; // default: 0.3
    errorRate: number; // default: 0.2
    avgDuration: number; // default: 0.1
  };
  thresholds: {
    excellentHealth: number; // default: 90
    goodHealth: number; // default: 70
    fairHealth: number; // default: 50
    poorHealth: number; // default: 30
  };
  trendsWindow: {
    daysForComparison: number; // default: 7
  };
}

export const DEFAULT_ANALYTICS_CONFIG: AnalyticsConfig = {
  healthScoreWeights: {
    uptime: 0.4,
    successRate: 0.3,
    errorRate: 0.2,
    avgDuration: 0.1
  },
  thresholds: {
    excellentHealth: 90,
    goodHealth: 70,
    fairHealth: 50,
    poorHealth: 30
  },
  trendsWindow: {
    daysForComparison: 7
  }
};

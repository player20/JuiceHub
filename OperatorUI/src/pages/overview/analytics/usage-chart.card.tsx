// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { useCustom } from '@refinedev/core';
import { UsageTrendChart, UsageTrendDataPoint } from '../../../components/analytics';
import { GET_USAGE_SNAPSHOTS } from '../../../graphql/analytics-queries';

/**
 * UsageChartCard - 7-day usage trend chart
 *
 * Displays:
 * - Last 7 days of usage data
 * - Switchable metrics (sessions, energy, revenue)
 * - Summary totals
 */
export const UsageChartCard: React.FC = () => {
  const endDate = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];

  const { data, isLoading } = useCustom({
    url: '',
    method: 'post',
    meta: {
      operation: 'GetUsageSnapshots',
      gqlVariables: {
        startDate: startDate,
        endDate: endDate,
      },
      gqlQuery: GET_USAGE_SNAPSHOTS,
    },
  });

  // Transform data for chart
  const chartData: UsageTrendDataPoint[] =
    data?.data?.usage_snapshots?.map((snapshot: any) => ({
      date: snapshot.snapshot_date,
      label: formatDateLabel(snapshot.snapshot_date),
      sessions: snapshot.total_sessions || 0,
      energyKwh: snapshot.total_energy_kwh || 0,
      revenue: snapshot.total_revenue || 0,
    })) || [];

  return (
    <UsageTrendChart
      title="7-Day Usage Trends"
      data={chartData}
      loading={isLoading}
      height={300}
    />
  );
};

/**
 * Format date for chart label (e.g., "Dec 18")
 */
function formatDateLabel(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

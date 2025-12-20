// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { useCustom } from '@refinedev/core';
import { TrendCard } from '../../../components/analytics';
import { GET_TODAY_STATS, GET_SPARKLINE_DATA } from '../../../graphql/analytics-queries';

/**
 * SessionsTrendCard - Shows total sessions with trend comparison
 *
 * Displays:
 * - Today's session count
 * - Percentage change from yesterday
 * - 24-hour sparkline
 */
export const SessionsTrendCard: React.FC = () => {
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  const last24Hours = new Date(Date.now() - 86400000).toISOString();

  // Get today and yesterday stats
  const { data: statsData, isLoading: statsLoading } = useCustom({
    url: '', // Hasura endpoint configured in data provider
    method: 'post',
    meta: {
      operation: 'GetTodayStats',
      variables: {
        today: { value: today, type: 'date', required: true },
      },
      gqlQuery: GET_TODAY_STATS,
    },
  } as any);

  // Get sparkline data (last 24 hours)
  const { data: sparklineData, isLoading: sparklineLoading } = useCustom({
    url: '',
    method: 'post',
    meta: {
      operation: 'GetSparklineData',
      variables: {
        startTime: { value: last24Hours, type: 'timestamptz', required: true },
      },
      gqlQuery: GET_SPARKLINE_DATA,
    },
  } as any);

  const todaySessions = statsData?.data?.today?.[0]?.total_sessions || 0;
  const yesterdaySessions = statsData?.data?.yesterday?.[0]?.total_sessions || 0;

  // Calculate trend percentage
  const trendValue =
    yesterdaySessions > 0
      ? ((todaySessions - yesterdaySessions) / yesterdaySessions) * 100
      : 0;

  // Process sparkline data (aggregate by hour)
  const sparkline = sparklineData?.data?.Transactions
    ? processSparklineData(sparklineData.data.Transactions)
    : [];

  return (
    <TrendCard
      title="Sessions Today"
      value={todaySessions}
      subtitle="charging sessions"
      trend={{
        value: trendValue,
        label: 'vs yesterday',
      }}
      sparklineData={sparkline}
      loading={statsLoading || sparklineLoading}
    />
  );
};

/**
 * Process transactions into hourly sparkline data
 */
function processSparklineData(transactions: any[]): number[] {
  if (!transactions || transactions.length === 0) return [];

  // Group by hour
  const hourlyData: { [key: string]: number } = {};

  transactions.forEach((tx) => {
    const hour = new Date(tx.time_start).getHours();
    hourlyData[hour] = (hourlyData[hour] || 0) + 1;
  });

  // Create array for last 24 hours
  const now = new Date();
  const sparkline: number[] = [];

  for (let i = 23; i >= 0; i--) {
    const targetHour = (now.getHours() - i + 24) % 24;
    sparkline.push(hourlyData[targetHour] || 0);
  }

  return sparkline;
}

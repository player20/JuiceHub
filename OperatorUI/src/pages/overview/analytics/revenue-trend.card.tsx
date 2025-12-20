// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { useCustom } from '@refinedev/core';
import { TrendCard } from '../../../components/analytics';
import { GET_TODAY_STATS } from '../../../graphql/analytics-queries';

/**
 * RevenueTrendCard - Shows total revenue with trend
 *
 * Displays:
 * - Today's revenue total
 * - Percentage change from yesterday
 */
export const RevenueTrendCard: React.FC = () => {
  const today = new Date().toISOString().split('T')[0];

  const { data: statsData, isLoading } = useCustom({
    url: '',
    method: 'post',
    meta: {
      operation: 'GetTodayStats',
      variables: {
        today: { value: today, type: 'date', required: true },
      },
      gqlQuery: GET_TODAY_STATS,
    },
  } as any);

  const todayRevenue = statsData?.data?.today?.[0]?.total_revenue || 0;
  const yesterdayRevenue = statsData?.data?.yesterday?.[0]?.total_revenue || 0;

  const trendValue =
    yesterdayRevenue > 0
      ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100
      : 0;

  return (
    <TrendCard
      title="Revenue"
      value={todayRevenue.toFixed(2)}
      prefix="$"
      subtitle="today"
      trend={{
        value: trendValue,
        label: 'vs yesterday',
      }}
      loading={isLoading}
      valueFormatter={(val) => Number(val).toFixed(2)}
    />
  );
};

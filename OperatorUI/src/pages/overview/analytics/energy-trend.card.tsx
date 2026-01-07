// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { useCustom } from '@refinedev/core';
import { TrendCard } from '../../../components/analytics';
import { GET_TODAY_STATS } from '../../../graphql/analytics-queries';

/**
 * EnergyTrendCard - Shows total energy delivered with trend
 *
 * Displays:
 * - Today's energy total (kWh)
 * - Percentage change from yesterday
 */
export const EnergyTrendCard: React.FC = () => {
  const today = new Date().toISOString().split('T')[0];

  const { data: statsData, isLoading } = useCustom({
    url: '',
    method: 'post',
    meta: {
      operation: 'GetTodayStats',
      gqlVariables: {
        today: today,
      },
      gqlQuery: GET_TODAY_STATS,
    },
  } as any);

  const todayEnergy = statsData?.data?.today?.[0]?.total_energy_kwh || 0;
  const yesterdayEnergy = statsData?.data?.yesterday?.[0]?.total_energy_kwh || 0;

  const trendValue =
    yesterdayEnergy > 0
      ? ((todayEnergy - yesterdayEnergy) / yesterdayEnergy) * 100
      : 0;

  return (
    <TrendCard
      title="Energy Delivered"
      value={todayEnergy.toFixed(1)}
      suffix="kWh"
      subtitle="today"
      trend={{
        value: trendValue,
        label: 'vs yesterday',
      }}
      loading={isLoading}
      valueFormatter={(val) => Number(val).toLocaleString()}
    />
  );
};

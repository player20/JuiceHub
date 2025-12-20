// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { Route, Routes } from 'react-router-dom';
import { AnalyticsDashboard } from './dashboard/analytics.dashboard';
import { StationPerformance } from './performance/station.performance';
import { UsageReports } from './reports/usage.reports';
import { BarChartOutlined } from '@ant-design/icons';

export const routes: React.FC = () => {
  return (
    <Routes>
      <Route index element={<AnalyticsDashboard />} />
      <Route path="performance" element={<StationPerformance />} />
      <Route path="reports" element={<UsageReports />} />
    </Routes>
  );
};

export const resources = [
  {
    name: 'analytics',
    list: '/analytics',
    meta: {
      label: 'Analytics',
    },
    icon: <BarChartOutlined />,
  },
];

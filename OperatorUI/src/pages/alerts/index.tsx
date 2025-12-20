// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { Route, Routes } from 'react-router-dom';
import { AlertsDashboard } from './dashboard/alerts.dashboard';
import { AlertRules } from './rules/alert.rules';
import { ActiveAlerts } from './active/active.alerts';
import { Incidents } from './incidents/incidents';
import { BellOutlined } from '@ant-design/icons';

export const routes: React.FC = () => {
  return (
    <Routes>
      <Route index element={<AlertsDashboard />} />
      <Route path="rules" element={<AlertRules />} />
      <Route path="active" element={<ActiveAlerts />} />
      <Route path="active/:id" element={<ActiveAlerts />} />
      <Route path="incidents" element={<Incidents />} />
      <Route path="incidents/:id" element={<Incidents />} />
    </Routes>
  );
};

export const resources = [
  {
    name: 'alerts',
    list: '/alerts',
    meta: {
      label: 'Alerts',
    },
    icon: <BellOutlined />,
  },
];

// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { Route, Routes } from 'react-router-dom';
import { SettingOutlined } from '@ant-design/icons';
import { SettingsLayout } from './layout/settings.layout';
import { ProfileSettings } from './profile/profile.settings';
import { SecuritySettings } from './security/security.settings';
import { BillingSettings } from './billing/billing.settings';
import { TeamSettings } from './team/team.settings';
import { NotificationSettings } from './notifications/notification.settings';
import { ApiKeysSettings } from './api-keys/api-keys.settings';
import { UsageSettings } from './usage/usage.settings';
import { PreferencesSettings } from './preferences/preferences.settings';

export const routes: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<SettingsLayout />}>
        <Route index element={<ProfileSettings />} />
        <Route path="profile" element={<ProfileSettings />} />
        <Route path="security" element={<SecuritySettings />} />
        <Route path="billing" element={<BillingSettings />} />
        <Route path="team" element={<TeamSettings />} />
        <Route path="notifications" element={<NotificationSettings />} />
        <Route path="api-keys" element={<ApiKeysSettings />} />
        <Route path="usage" element={<UsageSettings />} />
        <Route path="preferences" element={<PreferencesSettings />} />
      </Route>
    </Routes>
  );
};

export const resources = [
  {
    name: 'settings',
    list: '/settings',
    meta: {
      label: 'Settings',
    },
    icon: <SettingOutlined />,
  },
];

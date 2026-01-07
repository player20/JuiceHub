// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useCustom } from '@refinedev/core';
import { GET_SYSTEM_SETTINGS } from '../graphql/system-settings-queries';

interface SystemSettings {
  id: number;
  google_maps_api_key?: string;
  google_maps_enabled: boolean;
  organization_name?: string;
  support_email?: string;
  support_phone?: string;
}

interface SystemSettingsContextType {
  settings: SystemSettings | null;
  isLoading: boolean;
  refetch: () => void;
  getGoogleMapsApiKey: () => string;
}

const SystemSettingsContext = createContext<SystemSettingsContextType | undefined>(undefined);

export const SystemSettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<SystemSettings | null>(null);

  const { data, isLoading, refetch } = useCustom({
    url: '',
    method: 'post',
    meta: {
      operation: 'GetSystemSettings',
      gqlQuery: GET_SYSTEM_SETTINGS,
    },
    queryOptions: {
      retry: 3,
      retryDelay: 1000,
      refetchOnWindowFocus: false,
    },
  } as any);

  useEffect(() => {
    if (data?.data?.SystemSettings?.[0]) {
      setSettings(data.data.SystemSettings[0]);
    }
  }, [data]);

  const getGoogleMapsApiKey = (): string => {
    // Priority:
    // 1. Database settings (if enabled)
    // 2. Environment variable (fallback)
    // 3. Default placeholder
    if (settings?.google_maps_enabled && settings?.google_maps_api_key) {
      return settings.google_maps_api_key;
    }

    // Fallback to environment variable
    const envKey =
      (window as any).APP_CONFIG?.VITE_GOOGLE_MAPS_API_KEY ||
      import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

    return envKey || 'YOUR_GOOGLE_MAPS_API_KEY';
  };

  const value = {
    settings,
    isLoading,
    refetch,
    getGoogleMapsApiKey,
  };

  return (
    <SystemSettingsContext.Provider value={value}>
      {children}
    </SystemSettingsContext.Provider>
  );
};

export const useSystemSettings = () => {
  const context = useContext(SystemSettingsContext);
  if (context === undefined) {
    throw new Error('useSystemSettings must be used within a SystemSettingsProvider');
  }
  return context;
};

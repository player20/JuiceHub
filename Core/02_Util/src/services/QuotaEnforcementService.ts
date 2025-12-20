// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import { Tenant } from '@citrineos/data';
import { getCurrentTenant } from '../middleware/tenantContext';

/**
 * Custom error for quota exceeded scenarios
 */
export class QuotaExceededError extends Error {
  constructor(
    message: string,
    public readonly details: {
      current: number;
      limit: number;
      upgradeUrl?: string;
    },
  ) {
    super(message);
    this.name = 'QuotaExceededError';
  }
}

/**
 * Service to enforce resource quotas per tenant
 */
export class QuotaEnforcementService {
  /**
   * Check if tenant can add more charging stations
   * @throws QuotaExceededError if limit reached
   */
  static async canAddStation(tenantId?: number): Promise<boolean> {
    const { tenant } = tenantId
      ? { tenant: await Tenant.findByPk(tenantId) }
      : getCurrentTenant();

    if (!tenant) {
      throw new Error('Tenant not found');
    }

    const currentCount = (tenant as any).currentStationCount || 0;
    const maxStations = (tenant as any).maxStations || 5;

    if (currentCount >= maxStations) {
      throw new QuotaExceededError(
        `Station limit reached (${maxStations}). Please upgrade your plan to add more stations.`,
        {
          current: currentCount,
          limit: maxStations,
          upgradeUrl:
            process.env.BILLING_PORTAL_URL || '/billing/upgrade',
        },
      );
    }

    return true;
  }

  /**
   * Check if tenant can start a new charging session
   * @throws QuotaExceededError if limit reached
   */
  static async canStartSession(tenantId?: number): Promise<boolean> {
    const { tenant } = tenantId
      ? { tenant: await Tenant.findByPk(tenantId) }
      : getCurrentTenant();

    if (!tenant) {
      throw new Error('Tenant not found');
    }

    // Import dynamically to avoid circular dependency
    const { Transaction } = await import('@citrineos/data');

    // Count active sessions
    const activeSessions = await Transaction.count({
      where: {
        tenantId: tenant.id,
        isActive: true,
      },
    });

    const maxConcurrentSessions = (tenant as any).maxConcurrentSessions || 10;

    if (activeSessions >= maxConcurrentSessions) {
      throw new QuotaExceededError(
        `Concurrent session limit reached (${maxConcurrentSessions}). ` +
          `Please wait for active sessions to complete or upgrade your plan.`,
        {
          current: activeSessions,
          limit: maxConcurrentSessions,
          upgradeUrl:
            process.env.BILLING_PORTAL_URL || '/billing/upgrade',
        },
      );
    }

    return true;
  }

  /**
   * Check if tenant can upload a file
   * @param fileSizeBytes Size of file in bytes
   * @throws QuotaExceededError if limit reached
   */
  static async canUploadFile(
    fileSizeBytes: number,
    tenantId?: number,
  ): Promise<boolean> {
    const { tenant } = tenantId
      ? { tenant: await Tenant.findByPk(tenantId) }
      : getCurrentTenant();

    if (!tenant) {
      throw new Error('Tenant not found');
    }

    const currentUsageGB = (tenant as any).currentStorageUsedGB || 0;
    const maxStorageGB = (tenant as any).maxStorageGB || 1;
    const fileSizeGB = fileSizeBytes / (1024 * 1024 * 1024);
    const newUsageGB = currentUsageGB + fileSizeGB;

    if (newUsageGB > maxStorageGB) {
      throw new QuotaExceededError(
        `Storage limit reached (${maxStorageGB} GB). ` +
          `Current usage: ${currentUsageGB.toFixed(2)} GB. ` +
          `This file would exceed your limit.`,
        {
          current: parseFloat(currentUsageGB.toFixed(2)),
          limit: maxStorageGB,
          upgradeUrl:
            process.env.BILLING_PORTAL_URL || '/billing/upgrade',
        },
      );
    }

    return true;
  }

  /**
   * Check if tenant has access to a specific feature
   * @throws Error if feature not available
   */
  static async hasFeatureAccess(
    feature: string,
    tenantId?: number,
  ): Promise<boolean> {
    const { tenant } = tenantId
      ? { tenant: await Tenant.findByPk(tenantId) }
      : getCurrentTenant();

    if (!tenant) {
      throw new Error('Tenant not found');
    }

    const features = (tenant as any).features || {};
    const hasAccess = features[feature] ?? false;

    if (!hasAccess) {
      throw new Error(
        `Feature '${feature}' is not available on your plan. Please upgrade to access this feature.`,
      );
    }

    return true;
  }

  /**
   * Update tenant's current station count
   * Call this whenever stations are added/removed
   */
  static async updateStationCount(tenantId: number): Promise<void> {
    // Import dynamically to avoid circular dependency
    const { ChargingStation } = await import('@citrineos/data');

    const count = await ChargingStation.count({
      where: { tenantId },
    });

    await Tenant.update(
      { currentStationCount: count } as any,
      { where: { id: tenantId } } as any,
    );
  }

  /**
   * Update tenant's current storage usage
   * Call this whenever files are uploaded/deleted
   */
  static async updateStorageUsage(
    tenantId: number,
    deltaGB: number,
  ): Promise<void> {
    const tenant = await Tenant.findByPk(tenantId);
    if (!tenant) return;

    const currentUsage = (tenant as any).currentStorageUsedGB || 0;
    const newUsage = currentUsage + deltaGB;

    await tenant.update({
      currentStorageUsedGB: Math.max(0, newUsage),
    } as any);
  }

  /**
   * Reset daily API call counter
   * Run this as a cron job at midnight
   */
  static async resetDailyApiCalls(): Promise<void> {
    await Tenant.update(
      { apiCallsToday: 0 } as any,
      { where: {} } as any, // All tenants
    );
  }

  /**
   * Background job: Update all tenant usage stats
   * Run this periodically (e.g., every hour)
   */
  static async updateAllTenantUsageStats(): Promise<void> {
    const tenants = await Tenant.findAll();

    for (const tenant of tenants) {
      await this.updateStationCount(tenant.id);
      // Storage usage is updated incrementally, no need to recalculate
    }
  }

  /**
   * Get tenant usage summary
   */
  static async getUsageSummary(tenantId?: number): Promise<{
    stations: { current: number; limit: number; percentage: number };
    storage: { current: number; limit: number; percentage: number };
    apiCalls: { today: number; hourlyLimit: number };
    features: any;
  }> {
    const { tenant } = tenantId
      ? { tenant: await Tenant.findByPk(tenantId) }
      : getCurrentTenant();

    if (!tenant) {
      throw new Error('Tenant not found');
    }

    const currentStationCount = (tenant as any).currentStationCount || 0;
    const maxStations = (tenant as any).maxStations || 5;
    const currentStorageUsedGB = (tenant as any).currentStorageUsedGB || 0;
    const maxStorageGB = (tenant as any).maxStorageGB || 1;
    const apiCallsToday = (tenant as any).apiCallsToday || 0;
    const maxApiCallsPerHour = (tenant as any).maxApiCallsPerHour || 1000;
    const features = (tenant as any).features || {};

    return {
      stations: {
        current: currentStationCount,
        limit: maxStations,
        percentage: (currentStationCount / maxStations) * 100,
      },
      storage: {
        current: currentStorageUsedGB,
        limit: maxStorageGB,
        percentage: (currentStorageUsedGB / maxStorageGB) * 100,
      },
      apiCalls: {
        today: apiCallsToday,
        hourlyLimit: maxApiCallsPerHour,
      },
      features,
    };
  }
}

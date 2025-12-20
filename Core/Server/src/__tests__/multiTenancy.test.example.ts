// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

/**
 * Example test suite for multi-tenancy features
 *
 * These tests demonstrate how to test tenant isolation, quotas, and rate limiting
 * Copy and adapt for your test suite
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { FastifyInstance } from 'fastify';
import Redis from 'ioredis';
import {
  Tenant,
  SubscriptionTier,
  BillingStatus,
  DeploymentStrategy,
} from '@citrineos/data';
import { QuotaEnforcementService, QuotaExceededError } from '@citrineos/util/services/QuotaEnforcementService';
import { TenantProvisioningService } from '@citrineos/tenant';
import { runWithTenantContext } from '@citrineos/util/middleware/tenantContext';

describe('Multi-Tenancy', () => {
  let tenant1: Tenant;
  let tenant2: Tenant;

  beforeEach(async () => {
    // Create test tenants
    tenant1 = await Tenant.create({
      name: 'Test Tenant 1',
      contactEmail: 'tenant1@example.com',
      subscriptionTier: SubscriptionTier.FREE,
      billingStatus: BillingStatus.ACTIVE,
      deploymentStrategy: DeploymentStrategy.SHARED,
      maxStations: 5,
      maxApiCallsPerHour: 1000,
      maxStorageGB: 1,
      maxConcurrentSessions: 10,
      currentStationCount: 0,
      features: {
        analytics: false,
        revenue: false,
        alerts: true,
        smartCharging: false,
        v2g: false,
        customBranding: false,
        prioritySupport: false,
      },
    } as any);

    tenant2 = await Tenant.create({
      name: 'Test Tenant 2',
      contactEmail: 'tenant2@example.com',
      subscriptionTier: SubscriptionTier.PROFESSIONAL,
      billingStatus: BillingStatus.ACTIVE,
      deploymentStrategy: DeploymentStrategy.SHARED,
      maxStations: 100,
      maxApiCallsPerHour: 50000,
      maxStorageGB: 50,
      maxConcurrentSessions: 200,
      currentStationCount: 0,
      features: {
        analytics: true,
        revenue: true,
        alerts: true,
        smartCharging: true,
        v2g: false,
        customBranding: false,
        prioritySupport: true,
      },
    } as any);
  });

  afterEach(async () => {
    // Clean up test data
    await tenant1.destroy();
    await tenant2.destroy();
  });

  describe('Tenant Isolation', () => {
    it('should only return tenant-specific data', async () => {
      // Create stations for tenant 1
      await runWithTenantContext(tenant1.id, async () => {
        await ChargingStation.create({ name: 'Tenant 1 Station A' });
        await ChargingStation.create({ name: 'Tenant 1 Station B' });
      });

      // Create stations for tenant 2
      await runWithTenantContext(tenant2.id, async () => {
        await ChargingStation.create({ name: 'Tenant 2 Station A' });
      });

      // Query as tenant 1
      const tenant1Stations = await runWithTenantContext(tenant1.id, async () => {
        return await ChargingStation.findAll();
      });

      // Should only see tenant 1's stations
      expect(tenant1Stations).toHaveLength(2);
      expect(tenant1Stations.every((s) => s.tenantId === tenant1.id)).toBe(true);

      // Query as tenant 2
      const tenant2Stations = await runWithTenantContext(tenant2.id, async () => {
        return await ChargingStation.findAll();
      });

      // Should only see tenant 2's stations
      expect(tenant2Stations).toHaveLength(1);
      expect(tenant2Stations[0].tenantId).toBe(tenant2.id);
    });

    it('should prevent cross-tenant updates', async () => {
      // Create station as tenant 1
      const station = await runWithTenantContext(tenant1.id, async () => {
        return await ChargingStation.create({ name: 'Tenant 1 Station' });
      });

      // Try to update as tenant 2 (should fail)
      await expect(
        runWithTenantContext(tenant2.id, async () => {
          return await station.update({ name: 'Hacked!' });
        }),
      ).rejects.toThrow('Cannot update record from another tenant');
    });

    it('should automatically set tenantId on create', async () => {
      const station = await runWithTenantContext(tenant1.id, async () => {
        return await ChargingStation.create({ name: 'Auto Tenant Station' });
      });

      expect(station.tenantId).toBe(tenant1.id);
    });
  });

  describe('Quota Enforcement', () => {
    describe('Station Limits', () => {
      it('should allow creating stations within quota', async () => {
        await runWithTenantContext(tenant1.id, async () => {
          // FREE tier allows 5 stations
          for (let i = 0; i < 5; i++) {
            await expect(
              QuotaEnforcementService.canAddStation(),
            ).resolves.toBe(true);

            await ChargingStation.create({ name: `Station ${i}` });
            await QuotaEnforcementService.updateStationCount(tenant1.id);
          }
        });
      });

      it('should block creating stations over quota', async () => {
        await runWithTenantContext(tenant1.id, async () => {
          // Create 5 stations (FREE tier limit)
          for (let i = 0; i < 5; i++) {
            await ChargingStation.create({ name: `Station ${i}` });
          }
          await tenant1.update({ currentStationCount: 5 } as any);

          // 6th station should fail
          await expect(
            QuotaEnforcementService.canAddStation(),
          ).rejects.toThrow(QuotaExceededError);
        });
      });

      it('should provide helpful error message with upgrade link', async () => {
        await runWithTenantContext(tenant1.id, async () => {
          await tenant1.update({ currentStationCount: 5 } as any);

          try {
            await QuotaEnforcementService.canAddStation();
            fail('Should have thrown QuotaExceededError');
          } catch (error: any) {
            expect(error.name).toBe('QuotaExceededError');
            expect(error.message).toContain('Station limit reached (5)');
            expect(error.details.current).toBe(5);
            expect(error.details.limit).toBe(5);
            expect(error.details.upgradeUrl).toBeDefined();
          }
        });
      });
    });

    describe('Concurrent Session Limits', () => {
      it('should allow sessions within quota', async () => {
        await runWithTenantContext(tenant1.id, async () => {
          await expect(
            QuotaEnforcementService.canStartSession(),
          ).resolves.toBe(true);
        });
      });

      it('should block sessions over quota', async () => {
        await runWithTenantContext(tenant1.id, async () => {
          // Create 10 active sessions (FREE tier limit)
          for (let i = 0; i < 10; i++) {
            await Transaction.create({
              stationId: 'station-1',
              isActive: true,
            });
          }

          // 11th session should fail
          await expect(
            QuotaEnforcementService.canStartSession(),
          ).rejects.toThrow('Concurrent session limit reached');
        });
      });
    });

    describe('Storage Limits', () => {
      it('should allow uploads within quota', async () => {
        await runWithTenantContext(tenant1.id, async () => {
          const fileSizeBytes = 500 * 1024 * 1024; // 500 MB
          await expect(
            QuotaEnforcementService.canUploadFile(fileSizeBytes),
          ).resolves.toBe(true);
        });
      });

      it('should block uploads over quota', async () => {
        await runWithTenantContext(tenant1.id, async () => {
          await tenant1.update({ currentStorageUsedGB: 0.9 } as any);

          const fileSizeBytes = 200 * 1024 * 1024; // 200 MB (would exceed 1 GB limit)
          await expect(
            QuotaEnforcementService.canUploadFile(fileSizeBytes),
          ).rejects.toThrow('Storage limit reached');
        });
      });

      it('should update storage usage after upload', async () => {
        await runWithTenantContext(tenant1.id, async () => {
          const fileSizeBytes = 100 * 1024 * 1024; // 100 MB
          const fileSizeGB = fileSizeBytes / (1024 * 1024 * 1024);

          await QuotaEnforcementService.updateStorageUsage(
            tenant1.id,
            fileSizeGB,
          );

          const updatedTenant = await Tenant.findByPk(tenant1.id, {
            skipTenantFilter: true,
          } as any);

          expect(updatedTenant?.currentStorageUsedGB).toBeCloseTo(
            fileSizeGB,
            2,
          );
        });
      });
    });

    describe('Feature Access Control', () => {
      it('should allow access to enabled features', async () => {
        await runWithTenantContext(tenant2.id, async () => {
          // PROFESSIONAL tier has analytics enabled
          await expect(
            QuotaEnforcementService.hasFeatureAccess('analytics'),
          ).resolves.toBe(true);
        });
      });

      it('should block access to disabled features', async () => {
        await runWithTenantContext(tenant1.id, async () => {
          // FREE tier does not have analytics
          await expect(
            QuotaEnforcementService.hasFeatureAccess('analytics'),
          ).rejects.toThrow('not available on your plan');
        });
      });

      it('should allow all features for ENTERPRISE tier', async () => {
        const enterpriseTenant = await Tenant.create({
          name: 'Enterprise Tenant',
          subscriptionTier: SubscriptionTier.ENTERPRISE,
          features: {
            analytics: true,
            revenue: true,
            alerts: true,
            smartCharging: true,
            v2g: true,
            customBranding: true,
            prioritySupport: true,
          },
        } as any);

        await runWithTenantContext(enterpriseTenant.id, async () => {
          await expect(
            QuotaEnforcementService.hasFeatureAccess('analytics'),
          ).resolves.toBe(true);
          await expect(
            QuotaEnforcementService.hasFeatureAccess('revenue'),
          ).resolves.toBe(true);
          await expect(
            QuotaEnforcementService.hasFeatureAccess('smartCharging'),
          ).resolves.toBe(true);
          await expect(
            QuotaEnforcementService.hasFeatureAccess('v2g'),
          ).resolves.toBe(true);
        });

        await enterpriseTenant.destroy();
      });
    });
  });

  describe('Tenant Provisioning', () => {
    it('should provision tenant with FREE tier defaults', async () => {
      const newTenant = await TenantProvisioningService.provisionTenant({
        name: 'New Free Tenant',
        contactEmail: 'free@example.com',
        subscriptionTier: SubscriptionTier.FREE,
      });

      expect(newTenant.subscriptionTier).toBe(SubscriptionTier.FREE);
      expect(newTenant.maxStations).toBe(5);
      expect(newTenant.maxApiCallsPerHour).toBe(1000);
      expect(newTenant.maxStorageGB).toBe(1);
      expect(newTenant.maxConcurrentSessions).toBe(10);
      expect(newTenant.features.analytics).toBe(false);
      expect(newTenant.features.alerts).toBe(true);

      await newTenant.destroy();
    });

    it('should provision tenant with ENTERPRISE tier defaults', async () => {
      const newTenant = await TenantProvisioningService.provisionTenant({
        name: 'New Enterprise Tenant',
        contactEmail: 'enterprise@example.com',
        subscriptionTier: SubscriptionTier.ENTERPRISE,
      });

      expect(newTenant.subscriptionTier).toBe(SubscriptionTier.ENTERPRISE);
      expect(newTenant.maxStations).toBe(99999);
      expect(newTenant.maxApiCallsPerHour).toBe(999999);
      expect(newTenant.maxStorageGB).toBe(1000);
      expect(newTenant.maxConcurrentSessions).toBe(10000);
      expect(newTenant.features.analytics).toBe(true);
      expect(newTenant.features.revenue).toBe(true);
      expect(newTenant.features.smartCharging).toBe(true);
      expect(newTenant.features.v2g).toBe(true);

      await newTenant.destroy();
    });

    it('should apply custom quotas for enterprise', async () => {
      const newTenant = await TenantProvisioningService.provisionTenant({
        name: 'Custom Enterprise Tenant',
        contactEmail: 'custom@example.com',
        subscriptionTier: SubscriptionTier.ENTERPRISE,
        customQuotas: {
          maxStations: 500,
          maxApiCallsPerHour: 100000,
        },
      });

      expect(newTenant.maxStations).toBe(500);
      expect(newTenant.maxApiCallsPerHour).toBe(100000);
      expect(newTenant.maxStorageGB).toBe(1000); // Default ENTERPRISE value
      expect(newTenant.maxConcurrentSessions).toBe(10000); // Default ENTERPRISE value

      await newTenant.destroy();
    });

    it('should upgrade tenant and increase quotas', async () => {
      const upgradedTenant = await TenantProvisioningService.upgradeTenant(
        tenant1.id,
        SubscriptionTier.PROFESSIONAL,
      );

      expect(upgradedTenant.subscriptionTier).toBe(
        SubscriptionTier.PROFESSIONAL,
      );
      expect(upgradedTenant.maxStations).toBe(100);
      expect(upgradedTenant.maxApiCallsPerHour).toBe(50000);
      expect(upgradedTenant.features.analytics).toBe(true);
      expect(upgradedTenant.features.smartCharging).toBe(true);
    });

    it('should prevent downgrade if usage exceeds new limits', async () => {
      // Tenant 2 has PROFESSIONAL tier with 100 station limit
      await tenant2.update({ currentStationCount: 50 } as any);

      // Try to downgrade to STARTER (25 station limit)
      await expect(
        TenantProvisioningService.downgradeTenant(
          tenant2.id,
          SubscriptionTier.STARTER,
        ),
      ).rejects.toThrow('Current station count (50) exceeds');
    });

    it('should suspend and reactivate tenant', async () => {
      const suspendedTenant = await TenantProvisioningService.suspendTenant(
        tenant1.id,
      );
      expect(suspendedTenant.billingStatus).toBe(BillingStatus.SUSPENDED);

      const reactivatedTenant =
        await TenantProvisioningService.reactivateTenant(tenant1.id);
      expect(reactivatedTenant.billingStatus).toBe(BillingStatus.ACTIVE);
    });

    it('should deactivate tenant', async () => {
      const deactivatedTenant =
        await TenantProvisioningService.deactivateTenant(tenant1.id);
      expect(deactivatedTenant.billingStatus).toBe(BillingStatus.CANCELED);
      expect(deactivatedTenant.deactivatedAt).toBeDefined();
    });
  });

  describe('Rate Limiting', () => {
    let redis: Redis;
    let rateLimiter: ReturnType<typeof createRateLimiter>;

    beforeEach(() => {
      redis = new Redis();
      rateLimiter = createRateLimiter(redis);
    });

    afterEach(async () => {
      await redis.quit();
    });

    it('should allow requests within rate limit', async () => {
      const result = await rateLimiter.checkRateLimit(tenant1.id, 1000, 3600);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(999);
    });

    it('should block requests over rate limit', async () => {
      // Make 1000 requests
      for (let i = 0; i < 1000; i++) {
        await rateLimiter.checkRateLimit(tenant1.id, 1000, 3600);
      }

      // 1001st request should be blocked
      const result = await rateLimiter.checkRateLimit(tenant1.id, 1000, 3600);
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.retryAfter).toBeGreaterThan(0);
    });

    it('should reset rate limit after window expires', async () => {
      // Use a 1-second window for testing
      await rateLimiter.checkRateLimit(tenant1.id, 10, 1);

      // Wait for window to expire
      await new Promise((resolve) => setTimeout(resolve, 1100));

      // Should be reset
      const result = await rateLimiter.checkRateLimit(tenant1.id, 10, 1);
      expect(result.allowed).toBe(true);
    });

    it('should rate limit by IP for anonymous requests', async () => {
      const result = await rateLimiter.rateLimitByIP('192.168.1.1', 100, 60);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(99);
    });
  });

  describe('Usage Summary', () => {
    it('should return accurate usage summary', async () => {
      await tenant1.update({
        currentStationCount: 3,
        currentStorageUsedGB: 0.5,
        apiCallsToday: 250,
      } as any);

      const usage = await QuotaEnforcementService.getUsageSummary(tenant1.id);

      expect(usage.stations.current).toBe(3);
      expect(usage.stations.limit).toBe(5);
      expect(usage.stations.percentage).toBe(60);

      expect(usage.storage.current).toBe(0.5);
      expect(usage.storage.limit).toBe(1);
      expect(usage.storage.percentage).toBe(50);

      expect(usage.apiCalls.today).toBe(250);
      expect(usage.apiCalls.hourlyLimit).toBe(1000);

      expect(usage.features.analytics).toBe(false);
      expect(usage.features.alerts).toBe(true);
    });
  });
});

// Mock models for testing (replace with your actual models)
import { ChargingStation, Transaction } from '@citrineos/data';
import { createRateLimiter } from '@citrineos/util/middleware/rateLimiter';

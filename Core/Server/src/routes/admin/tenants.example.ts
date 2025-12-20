// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

/**
 * Example Admin API endpoints for tenant management
 *
 * These endpoints should be protected with admin authentication
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  Tenant,
  SubscriptionTier,
  BillingStatus,
  DeploymentStrategy,
} from '@citrineos/data';
import { TenantProvisioningService } from '@citrineos/tenant';
import { QuotaEnforcementService } from '@citrineos/util/services/QuotaEnforcementService';

/**
 * Register admin tenant management routes
 */
export async function registerAdminTenantRoutes(
  server: FastifyInstance,
): Promise<void> {
  // Prefix all routes with /admin
  const prefix = '/admin';

  // 1. List all tenants
  server.get(
    `${prefix}/tenants`,
    {
      schema: {
        description: 'List all tenants',
        tags: ['Admin', 'Tenants'],
        querystring: {
          type: 'object',
          properties: {
            page: { type: 'number', default: 1 },
            limit: { type: 'number', default: 20 },
            tier: {
              type: 'string',
              enum: Object.values(SubscriptionTier),
            },
            status: {
              type: 'string',
              enum: Object.values(BillingStatus),
            },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              tenants: { type: 'array' },
              total: { type: 'number' },
              page: { type: 'number' },
              pages: { type: 'number' },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Querystring: {
          page?: number;
          limit?: number;
          tier?: SubscriptionTier;
          status?: BillingStatus;
        };
      }>,
      reply: FastifyReply,
    ) => {
      const { page = 1, limit = 20, tier, status } = request.query;
      const offset = (page - 1) * limit;

      const where: any = {};
      if (tier) where.subscriptionTier = tier;
      if (status) where.billingStatus = status;

      const { count, rows: tenants } = await Tenant.findAndCountAll({
        where,
        limit,
        offset,
        order: [['createdAt', 'DESC']],
        skipTenantFilter: true, // Admin can see all tenants
      } as any);

      return reply.send({
        tenants,
        total: count,
        page,
        pages: Math.ceil(count / limit),
      });
    },
  );

  // 2. Get tenant by ID
  server.get(
    `${prefix}/tenants/:id`,
    {
      schema: {
        description: 'Get tenant details',
        tags: ['Admin', 'Tenants'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'number' },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: { id: number } }>,
      reply: FastifyReply,
    ) => {
      const tenant = await Tenant.findByPk(request.params.id, {
        skipTenantFilter: true,
      } as any);

      if (!tenant) {
        return reply.code(404).send({ error: 'Tenant not found' });
      }

      // Get usage summary
      const usage = await QuotaEnforcementService.getUsageSummary(tenant.id);

      return reply.send({
        tenant,
        usage,
      });
    },
  );

  // 3. Create new tenant
  server.post(
    `${prefix}/tenants`,
    {
      schema: {
        description: 'Create a new tenant',
        tags: ['Admin', 'Tenants'],
        body: {
          type: 'object',
          required: ['name', 'contactEmail', 'subscriptionTier'],
          properties: {
            name: { type: 'string' },
            contactEmail: { type: 'string', format: 'email' },
            subscriptionTier: {
              type: 'string',
              enum: Object.values(SubscriptionTier),
            },
            deploymentStrategy: {
              type: 'string',
              enum: Object.values(DeploymentStrategy),
            },
            region: { type: 'string' },
            customQuotas: {
              type: 'object',
              properties: {
                maxStations: { type: 'number' },
                maxApiCallsPerHour: { type: 'number' },
                maxStorageGB: { type: 'number' },
                maxConcurrentSessions: { type: 'number' },
              },
            },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              tenant: { type: 'object' },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Body: {
          name: string;
          contactEmail: string;
          subscriptionTier: SubscriptionTier;
          deploymentStrategy?: DeploymentStrategy;
          region?: string;
          customQuotas?: {
            maxStations?: number;
            maxApiCallsPerHour?: number;
            maxStorageGB?: number;
            maxConcurrentSessions?: number;
          };
        };
      }>,
      reply: FastifyReply,
    ) => {
      try {
        const tenant = await TenantProvisioningService.provisionTenant(
          request.body,
        );

        return reply.code(201).send({ tenant });
      } catch (error: any) {
        return reply.code(400).send({ error: error.message });
      }
    },
  );

  // 4. Update tenant tier
  server.put(
    `${prefix}/tenants/:id/tier`,
    {
      schema: {
        description: 'Update tenant subscription tier',
        tags: ['Admin', 'Tenants'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'number' },
          },
        },
        body: {
          type: 'object',
          required: ['tier'],
          properties: {
            tier: {
              type: 'string',
              enum: Object.values(SubscriptionTier),
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Params: { id: number };
        Body: { tier: SubscriptionTier };
      }>,
      reply: FastifyReply,
    ) => {
      try {
        const tenant = await Tenant.findByPk(request.params.id, {
          skipTenantFilter: true,
        } as any);

        if (!tenant) {
          return reply.code(404).send({ error: 'Tenant not found' });
        }

        // Determine if upgrade or downgrade
        const tierOrder = [
          SubscriptionTier.FREE,
          SubscriptionTier.STARTER,
          SubscriptionTier.PROFESSIONAL,
          SubscriptionTier.ENTERPRISE,
        ];

        const currentIndex = tierOrder.indexOf(tenant.subscriptionTier);
        const newIndex = tierOrder.indexOf(request.body.tier);

        let updatedTenant;
        if (newIndex > currentIndex) {
          // Upgrade
          updatedTenant = await TenantProvisioningService.upgradeTenant(
            request.params.id,
            request.body.tier,
          );
        } else if (newIndex < currentIndex) {
          // Downgrade
          updatedTenant = await TenantProvisioningService.downgradeTenant(
            request.params.id,
            request.body.tier,
          );
        } else {
          // No change
          updatedTenant = tenant;
        }

        return reply.send({ tenant: updatedTenant });
      } catch (error: any) {
        return reply.code(400).send({ error: error.message });
      }
    },
  );

  // 5. Suspend tenant
  server.post(
    `${prefix}/tenants/:id/suspend`,
    {
      schema: {
        description: 'Suspend a tenant (payment issues)',
        tags: ['Admin', 'Tenants'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'number' },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: { id: number } }>,
      reply: FastifyReply,
    ) => {
      try {
        const tenant = await TenantProvisioningService.suspendTenant(
          request.params.id,
        );
        return reply.send({ tenant });
      } catch (error: any) {
        return reply.code(400).send({ error: error.message });
      }
    },
  );

  // 6. Reactivate tenant
  server.post(
    `${prefix}/tenants/:id/reactivate`,
    {
      schema: {
        description: 'Reactivate a suspended tenant',
        tags: ['Admin', 'Tenants'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'number' },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: { id: number } }>,
      reply: FastifyReply,
    ) => {
      try {
        const tenant = await TenantProvisioningService.reactivateTenant(
          request.params.id,
        );
        return reply.send({ tenant });
      } catch (error: any) {
        return reply.code(400).send({ error: error.message });
      }
    },
  );

  // 7. Deactivate tenant (offboarding)
  server.delete(
    `${prefix}/tenants/:id`,
    {
      schema: {
        description: 'Deactivate a tenant (permanent)',
        tags: ['Admin', 'Tenants'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'number' },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: { id: number } }>,
      reply: FastifyReply,
    ) => {
      try {
        const tenant = await TenantProvisioningService.deactivateTenant(
          request.params.id,
        );
        return reply.send({ tenant });
      } catch (error: any) {
        return reply.code(400).send({ error: error.message });
      }
    },
  );

  // 8. Get tenant usage statistics
  server.get(
    `${prefix}/tenants/:id/usage`,
    {
      schema: {
        description: 'Get tenant usage statistics',
        tags: ['Admin', 'Tenants'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'number' },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: { id: number } }>,
      reply: FastifyReply,
    ) => {
      const usage = await QuotaEnforcementService.getUsageSummary(
        request.params.id,
      );
      return reply.send(usage);
    },
  );

  // 9. Update tenant quotas (custom plans)
  server.patch(
    `${prefix}/tenants/:id/quotas`,
    {
      schema: {
        description: 'Update tenant quotas (enterprise custom plans)',
        tags: ['Admin', 'Tenants'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'number' },
          },
        },
        body: {
          type: 'object',
          properties: {
            maxStations: { type: 'number' },
            maxApiCallsPerHour: { type: 'number' },
            maxStorageGB: { type: 'number' },
            maxConcurrentSessions: { type: 'number' },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Params: { id: number };
        Body: Partial<{
          maxStations: number;
          maxApiCallsPerHour: number;
          maxStorageGB: number;
          maxConcurrentSessions: number;
        }>;
      }>,
      reply: FastifyReply,
    ) => {
      const tenant = await Tenant.findByPk(request.params.id, {
        skipTenantFilter: true,
      } as any);

      if (!tenant) {
        return reply.code(404).send({ error: 'Tenant not found' });
      }

      await tenant.update(request.body as any);

      return reply.send({ tenant });
    },
  );

  // 10. Get all tenants stats (dashboard)
  server.get(
    `${prefix}/tenants/stats`,
    {
      schema: {
        description: 'Get aggregate tenant statistics',
        tags: ['Admin', 'Tenants'],
        response: {
          200: {
            type: 'object',
            properties: {
              totalTenants: { type: 'number' },
              byTier: { type: 'object' },
              byStatus: { type: 'object' },
              totalStations: { type: 'number' },
              totalStorageGB: { type: 'number' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenants = await Tenant.findAll({
        skipTenantFilter: true,
      } as any);

      const stats = {
        totalTenants: tenants.length,
        byTier: {
          free: tenants.filter((t) => t.subscriptionTier === 'free').length,
          starter: tenants.filter((t) => t.subscriptionTier === 'starter')
            .length,
          professional: tenants.filter(
            (t) => t.subscriptionTier === 'professional',
          ).length,
          enterprise: tenants.filter((t) => t.subscriptionTier === 'enterprise')
            .length,
        },
        byStatus: {
          active: tenants.filter((t) => t.billingStatus === 'active').length,
          suspended: tenants.filter((t) => t.billingStatus === 'suspended')
            .length,
          canceled: tenants.filter((t) => t.billingStatus === 'canceled')
            .length,
        },
        totalStations: tenants.reduce(
          (sum, t) => sum + (t.currentStationCount || 0),
          0,
        ),
        totalStorageGB: tenants.reduce(
          (sum, t) => sum + (t.currentStorageUsedGB || 0),
          0,
        ),
      };

      return reply.send(stats);
    },
  );

  console.log(`[Admin] Tenant management routes registered at ${prefix}/tenants`);
}

/**
 * Middleware to protect admin routes
 * Add this before calling registerAdminTenantRoutes()
 */
export async function requireAdminAuth(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  // TODO: Implement your admin authentication logic
  // Example:
  const user = request.user as any; // From your auth middleware

  if (!user || user.role !== 'admin') {
    return reply.code(403).send({
      error: 'Forbidden',
      message: 'Admin access required',
    });
  }
}

/**
 * Example usage in server.ts:
 *
 * import { registerAdminTenantRoutes, requireAdminAuth } from './routes/admin/tenants.example';
 *
 * // Protect all admin routes
 * server.addHook('onRequest', async (request, reply) => {
 *   if (request.url.startsWith('/admin')) {
 *     await requireAdminAuth(request, reply);
 *   }
 * });
 *
 * // Register admin routes
 * await registerAdminTenantRoutes(server);
 */

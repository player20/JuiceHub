// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

/**
 * Example integration of multi-tenancy middleware into Fastify server
 *
 * Copy this code into your server.ts or create a separate middleware setup file
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import Redis from 'ioredis';
import { tenantContextMiddleware } from '@citrineos/util/middleware/tenantContext';
import { createRateLimiter } from '@citrineos/util/middleware/rateLimiter';
import { QuotaEnforcementService } from '@citrineos/util/services/QuotaEnforcementService';

/**
 * Configure Redis client
 */
export function createRedisClient(): Redis {
  return new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0'),
    retryStrategy: (times: number) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    reconnectOnError: (err) => {
      const targetError = 'READONLY';
      if (err.message.includes(targetError)) {
        // Only reconnect when the error contains "READONLY"
        return true;
      }
      return false;
    },
  });
}

/**
 * Setup multi-tenancy middleware on Fastify server
 */
export async function setupMultiTenancyMiddleware(
  server: FastifyInstance,
): Promise<void> {
  // 1. Create Redis client for rate limiting
  const redis = createRedisClient();
  const rateLimiter = createRateLimiter(redis);

  // Log Redis connection
  redis.on('connect', () => {
    console.log('[Multi-Tenancy] Redis connected');
  });

  redis.on('error', (err) => {
    console.error('[Multi-Tenancy] Redis error:', err);
  });

  // 2. Add IP-based rate limiter (BEFORE authentication)
  // Prevents brute force attacks and DDoS
  server.addHook('onRequest', rateLimiter.ipRateLimitMiddleware(100, 60));
  console.log('[Multi-Tenancy] IP rate limiter installed (100 req/min)');

  // 3. Add tenant context middleware (AFTER authentication)
  // Skip for public endpoints
  server.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    // Skip public paths
    const publicPaths = [
      '/health',
      '/metrics',
      '/ready',
      '/login',
      '/register',
      '/docs',
      '/swagger',
    ];

    if (publicPaths.some((path) => request.url.startsWith(path))) {
      return;
    }

    // Establish tenant context
    await tenantContextMiddleware(request, reply);
  });
  console.log('[Multi-Tenancy] Tenant context middleware installed');

  // 4. Add per-tenant rate limiter (AFTER tenant context)
  server.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    const publicPaths = [
      '/health',
      '/metrics',
      '/ready',
      '/login',
      '/register',
      '/docs',
      '/swagger',
    ];

    if (publicPaths.some((path) => request.url.startsWith(path))) {
      return;
    }

    await rateLimiter.middleware()(request, reply);
  });
  console.log('[Multi-Tenancy] Per-tenant rate limiter installed');

  // 5. Add quota enforcement examples (in your route handlers)
  // See examples below for how to use QuotaEnforcementService

  console.log('[Multi-Tenancy] All middleware installed successfully ✅');
}

/**
 * Example: Enforce quota before adding a charging station
 */
export async function exampleCreateStation(
  request: FastifyRequest<{ Body: { name: string } }>,
  reply: FastifyReply,
) {
  try {
    // Check station quota BEFORE creating
    await QuotaEnforcementService.canAddStation();

    // Create station (your existing logic)
    const station = await ChargingStation.create({
      name: request.body.name,
      // tenantId is set automatically by BaseModel hooks!
    });

    // Update station count
    const { tenantId } = getCurrentTenant();
    await QuotaEnforcementService.updateStationCount(tenantId);

    return reply.code(201).send(station);
  } catch (error) {
    if (error.name === 'QuotaExceededError') {
      return reply.code(402).send({
        error: 'Quota exceeded',
        message: error.message,
        details: error.details,
      });
    }
    throw error;
  }
}

/**
 * Example: Enforce quota before starting a transaction
 */
export async function exampleStartTransaction(
  request: FastifyRequest<{ Body: { stationId: string } }>,
  reply: FastifyReply,
) {
  try {
    // Check concurrent session quota
    await QuotaEnforcementService.canStartSession();

    // Start transaction (your existing logic)
    const transaction = await Transaction.create({
      stationId: request.body.stationId,
      isActive: true,
      // tenantId is set automatically!
    });

    return reply.code(201).send(transaction);
  } catch (error) {
    if (error.name === 'QuotaExceededError') {
      return reply.code(402).send({
        error: 'Quota exceeded',
        message: error.message,
        details: error.details,
      });
    }
    throw error;
  }
}

/**
 * Example: Check feature access before allowing analytics
 */
export async function exampleGetAnalytics(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    // Check if tenant has analytics feature
    await QuotaEnforcementService.hasFeatureAccess('analytics');

    // Return analytics data (your existing logic)
    const analytics = await getAnalyticsData();

    return reply.send(analytics);
  } catch (error) {
    if (error.message.includes('not available on your plan')) {
      return reply.code(403).send({
        error: 'Feature not available',
        message: error.message,
        upgradeUrl: '/billing/upgrade',
      });
    }
    throw error;
  }
}

/**
 * Example: File upload with storage quota check
 */
export async function exampleUploadFile(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const data = await request.file();
    if (!data) {
      return reply.code(400).send({ error: 'No file uploaded' });
    }

    // Check storage quota
    const fileSize = parseInt(request.headers['content-length'] || '0');
    await QuotaEnforcementService.canUploadFile(fileSize);

    // Save file (your existing logic)
    const savedFile = await saveFile(data);

    // Update storage usage
    const { tenantId } = getCurrentTenant();
    const fileSizeGB = fileSize / (1024 * 1024 * 1024);
    await QuotaEnforcementService.updateStorageUsage(tenantId, fileSizeGB);

    return reply.send(savedFile);
  } catch (error) {
    if (error.name === 'QuotaExceededError') {
      return reply.code(402).send({
        error: 'Storage quota exceeded',
        message: error.message,
        details: error.details,
      });
    }
    throw error;
  }
}

/**
 * Example: Get tenant usage summary endpoint
 */
export async function exampleGetUsage(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const usage = await QuotaEnforcementService.getUsageSummary();
  return reply.send(usage);
}

/**
 * Graceful shutdown - close Redis connection
 */
export async function shutdownMultiTenancy(redis: Redis): Promise<void> {
  await redis.quit();
  console.log('[Multi-Tenancy] Redis connection closed');
}

// Import these in your server.ts:
import { getCurrentTenant } from '@citrineos/util/middleware/tenantContext';
import { ChargingStation, Transaction } from '@citrineos/data';

// Placeholder functions (replace with your actual implementations)
async function getAnalyticsData() {
  return { message: 'Analytics data' };
}

async function saveFile(data: any) {
  return { filename: data.filename };
}

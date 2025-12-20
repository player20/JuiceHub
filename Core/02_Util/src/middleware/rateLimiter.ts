// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import { FastifyRequest, FastifyReply } from 'fastify';
import { getCurrentTenant } from './tenantContext';

/**
 * Redis-based rate limiter for multi-tenant applications
 * Uses token bucket algorithm
 */
export class TenantRateLimiter {
  private redis: any; // Redis client

  constructor(redis: any) {
    this.redis = redis;
  }

  /**
   * Check if request is within rate limit
   * @param tenantId Tenant ID
   * @param limit Maximum requests allowed in window
   * @param windowSeconds Time window in seconds
   * @returns Rate limit status
   */
  async checkRateLimit(
    tenantId: number,
    limit: number,
    windowSeconds: number = 3600,
  ): Promise<{
    allowed: boolean;
    remaining: number;
    resetAt: number;
    retryAfter?: number;
  }> {
    const now = Date.now();
    const windowMs = windowSeconds * 1000;
    const windowStart = Math.floor(now / windowMs);
    const key = `ratelimit:tenant:${tenantId}:${windowStart}`;

    try {
      // Increment counter atomically
      const count = await this.redis.incr(key);

      // Set expiry on first request
      if (count === 1) {
        await this.redis.expire(key, windowSeconds);
      }

      const remaining = Math.max(0, limit - count);
      const resetAt = (windowStart + 1) * windowMs;
      const allowed = count <= limit;

      if (!allowed) {
        // Calculate retry after in seconds
        const retryAfterMs = resetAt - now;
        const retryAfter = Math.ceil(retryAfterMs / 1000);

        return {
          allowed,
          remaining,
          resetAt,
          retryAfter,
        };
      }

      return {
        allowed,
        remaining,
        resetAt,
      };
    } catch (error) {
      // If Redis is down, allow the request (fail open)
      console.error('Rate limiter error:', error);
      return {
        allowed: true,
        remaining: limit,
        resetAt: now + windowMs,
      };
    }
  }

  /**
   * Fastify middleware for rate limiting
   */
  middleware() {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { tenant } = getCurrentTenant();

        // Check rate limit
        const maxApiCalls = (tenant as any).maxApiCallsPerHour || 1000;
        const result = await this.checkRateLimit(
          tenant.id,
          maxApiCalls,
          3600, // 1 hour
        );

        // Set rate limit headers (standard RateLimit headers)
        reply.header('X-RateLimit-Limit', maxApiCalls.toString());
        reply.header('X-RateLimit-Remaining', result.remaining.toString());
        reply.header(
          'X-RateLimit-Reset',
          new Date(result.resetAt).toISOString(),
        );

        if (!result.allowed) {
          // Set Retry-After header
          if (result.retryAfter) {
            reply.header('Retry-After', result.retryAfter.toString());
          }

          reply.code(429).send({
            error: 'Rate limit exceeded',
            message: `You have exceeded your hourly API limit of ${maxApiCalls} requests.`,
            limit: maxApiCalls,
            remaining: result.remaining,
            resetAt: new Date(result.resetAt).toISOString(),
            retryAfter: result.retryAfter,
            upgradeUrl: process.env.BILLING_PORTAL_URL || '/billing/upgrade',
          });
        }
      } catch (error: any) {
        // If tenant context is not available, skip rate limiting
        // (e.g., for public endpoints)
        console.warn('Rate limiter skipped:', error.message);
      }
    };
  }

  /**
   * Advanced: Sliding window rate limiter
   * More accurate but slightly more expensive
   */
  async slidingWindowRateLimit(
    tenantId: number,
    limit: number,
    windowSeconds: number = 3600,
  ): Promise<{
    allowed: boolean;
    remaining: number;
    resetAt: number;
  }> {
    const now = Date.now();
    const windowMs = windowSeconds * 1000;
    const key = `ratelimit:sliding:tenant:${tenantId}`;

    try {
      // Remove old entries outside the window
      await this.redis.zremrangebyscore(key, 0, now - windowMs);

      // Count requests in current window
      const count = await this.redis.zcard(key);

      if (count >= limit) {
        // Get oldest request timestamp to calculate reset time
        const oldest = await this.redis.zrange(key, 0, 0, 'WITHSCORES');
        const resetAt = oldest.length > 0
          ? parseInt(oldest[1]) + windowMs
          : now + windowMs;

        return {
          allowed: false,
          remaining: 0,
          resetAt,
        };
      }

      // Add current request
      await this.redis.zadd(key, now, `${now}-${Math.random()}`);

      // Set expiry
      await this.redis.expire(key, windowSeconds);

      return {
        allowed: true,
        remaining: limit - count - 1,
        resetAt: now + windowMs,
      };
    } catch (error) {
      console.error('Sliding window rate limiter error:', error);
      return {
        allowed: true,
        remaining: limit,
        resetAt: now + windowMs,
      };
    }
  }

  /**
   * Rate limit by IP address (for anonymous/unauthenticated requests)
   */
  async rateLimitByIP(
    ip: string,
    limit: number = 100,
    windowSeconds: number = 60,
  ): Promise<{
    allowed: boolean;
    remaining: number;
    resetAt: number;
  }> {
    const now = Date.now();
    const windowMs = windowSeconds * 1000;
    const windowStart = Math.floor(now / windowMs);
    const key = `ratelimit:ip:${ip}:${windowStart}`;

    try {
      const count = await this.redis.incr(key);

      if (count === 1) {
        await this.redis.expire(key, windowSeconds);
      }

      const remaining = Math.max(0, limit - count);
      const resetAt = (windowStart + 1) * windowMs;

      return {
        allowed: count <= limit,
        remaining,
        resetAt,
      };
    } catch (error) {
      console.error('IP rate limiter error:', error);
      return {
        allowed: true,
        remaining: limit,
        resetAt: now + windowMs,
      };
    }
  }

  /**
   * Middleware for IP-based rate limiting (before authentication)
   */
  ipRateLimitMiddleware(limit: number = 100, windowSeconds: number = 60) {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      const ip = request.ip;

      const result = await this.rateLimitByIP(ip, limit, windowSeconds);

      reply.header('X-RateLimit-Limit', limit.toString());
      reply.header('X-RateLimit-Remaining', result.remaining.toString());
      reply.header(
        'X-RateLimit-Reset',
        new Date(result.resetAt).toISOString(),
      );

      if (!result.allowed) {
        const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000);
        reply.header('Retry-After', retryAfter.toString());

        reply.code(429).send({
          error: 'Too many requests',
          message: `Rate limit exceeded. Please try again in ${retryAfter} seconds.`,
          limit,
          remaining: result.remaining,
          resetAt: new Date(result.resetAt).toISOString(),
          retryAfter,
        });
      }
    };
  }

  /**
   * Increment API call counter for billing/metering
   */
  async incrementApiCallCounter(tenantId: number): Promise<void> {
    const { Tenant } = await import('@citrineos/data');

    try {
      // Increment today's counter in database
      const tenant = await Tenant.findByPk(tenantId);
      if (tenant) {
        const currentCount = (tenant as any).apiCallsToday || 0;
        await tenant.update({ apiCallsToday: currentCount + 1 } as any);
      }

      // Also track in Redis for real-time monitoring
      const today = new Date().toISOString().split('T')[0];
      const key = `metrics:tenant:${tenantId}:api_calls:${today}`;
      await this.redis.incr(key);
      await this.redis.expire(key, 86400 * 7); // Keep for 7 days
    } catch (error) {
      console.error('Error incrementing API call counter:', error);
    }
  }
}

/**
 * Create rate limiter instance
 * @param redis Redis client instance
 */
export function createRateLimiter(redis: any): TenantRateLimiter {
  return new TenantRateLimiter(redis);
}

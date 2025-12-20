// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import { AsyncLocalStorage } from 'async_hooks';
import { FastifyRequest, FastifyReply } from 'fastify';
import { Tenant } from '@citrineos/data';
import jwt from 'jsonwebtoken';

/**
 * Tenant Context stored in AsyncLocalStorage
 * Available throughout the entire request lifecycle without passing it explicitly
 */
export interface ITenantContext {
  tenantId: number;
  tenant: Tenant;
}

/**
 * Thread-local storage for tenant context
 * Automatically propagates through async calls
 */
export const tenantContext = new AsyncLocalStorage<ITenantContext>();

/**
 * Get current tenant from AsyncLocalStorage
 * @throws Error if no tenant context is available
 */
export function getCurrentTenant(): ITenantContext {
  const context = tenantContext.getStore();
  if (!context) {
    throw new Error(
      'Tenant context not available. Ensure tenantContextMiddleware is installed.',
    );
  }
  return context;
}

/**
 * Get current tenant or null if not available
 * Use this for optional tenant context (e.g., background jobs)
 */
export function getCurrentTenantOrNull(): ITenantContext | null {
  return tenantContext.getStore() || null;
}

/**
 * Extract tenant ID from various sources
 */
export class TenantIdentificationStrategy {
  /**
   * Strategy 1: Extract from JWT token
   */
  static async fromJWT(request: FastifyRequest): Promise<number | null> {
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.substring(7);
    try {
      const jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
      const decoded = jwt.verify(token, jwtSecret) as any;
      return decoded.tenantId ? parseInt(decoded.tenantId, 10) : null;
    } catch (err) {
      // Invalid token
      return null;
    }
  }

  /**
   * Strategy 2: Extract from subdomain (e.g., acme.citrineos.com)
   */
  static async fromSubdomain(request: FastifyRequest): Promise<number | null> {
    const host = request.headers.host;
    if (!host) return null;

    const subdomain = host.split('.')[0];
    if (!subdomain || subdomain === 'www' || subdomain === 'api') {
      return null;
    }

    // Look up tenant by subdomain/slug
    const tenant = await Tenant.findOne({
      where: { name: subdomain } as any,
    });

    return tenant ? tenant.id : null;
  }

  /**
   * Strategy 3: Extract from X-Tenant-ID header
   */
  static async fromHeader(request: FastifyRequest): Promise<number | null> {
    const tenantId = request.headers['x-tenant-id'] as string;
    return tenantId ? parseInt(tenantId, 10) : null;
  }

  /**
   * Strategy 4: Extract from OCPP station ID lookup
   * For OCPP WebSocket connections
   */
  static async fromOCPPStation(
    request: FastifyRequest,
  ): Promise<number | null> {
    if (!request.url.includes('/ocpp/')) {
      return null;
    }

    // Extract station ID from URL (e.g., /ocpp/v2.0.1/{stationId})
    const stationIdMatch = request.url.match(/\/ocpp\/v[\d.]+\/([^/]+)/);
    if (!stationIdMatch) {
      return null;
    }

    const stationId = stationIdMatch[1];

    // Import dynamically to avoid circular dependency
    const { ChargingStation } = await import('@citrineos/data');

    const station = await ChargingStation.findOne({
      where: { id: stationId },
      include: [
        {
          model: Tenant,
          as: 'tenant',
        },
      ],
    });

    return station?.tenantId || null;
  }

  /**
   * Try all strategies in order of priority
   */
  static async identify(request: FastifyRequest): Promise<number | null> {
    // Try JWT first (most secure)
    let tenantId = await this.fromJWT(request);
    if (tenantId) return tenantId;

    // Try custom header (for API calls)
    tenantId = await this.fromHeader(request);
    if (tenantId) return tenantId;

    // Try subdomain (for multi-tenant SaaS)
    tenantId = await this.fromSubdomain(request);
    if (tenantId) return tenantId;

    // Try OCPP station lookup (for WebSocket connections)
    tenantId = await this.fromOCPPStation(request);
    if (tenantId) return tenantId;

    return null;
  }
}

/**
 * Fastify middleware to establish tenant context
 * Place this early in your middleware chain
 */
export async function tenantContextMiddleware(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  // Skip tenant identification for health checks and public endpoints
  const publicPaths = ['/health', '/metrics', '/ready', '/login', '/register'];
  if (publicPaths.some((path) => request.url.startsWith(path))) {
    return;
  }

  // Identify tenant
  const tenantId = await TenantIdentificationStrategy.identify(request);

  if (!tenantId) {
    reply.code(400).send({
      error: 'Tenant identification required',
      message:
        'Unable to identify tenant. Please provide tenant ID via JWT token, X-Tenant-ID header, or subdomain.',
    });
    return;
  }

  // Load full tenant record
  const tenant = await Tenant.findByPk(tenantId);

  if (!tenant) {
    reply.code(404).send({
      error: 'Tenant not found',
      message: `Tenant with ID ${tenantId} does not exist.`,
    });
    return;
  }

  // Check tenant status
  const billingStatus = (tenant as any).billingStatus;
  if (billingStatus && billingStatus !== 'active') {
    reply.code(402).send({
      error: 'Payment required',
      message:
        'Your subscription is not active. Please update your billing information.',
      billingStatus,
      upgradeUrl: process.env.BILLING_PORTAL_URL || '/billing',
    });
    return;
  }

  // Check if tenant is deactivated
  const deactivatedAt = (tenant as any).deactivatedAt;
  if (deactivatedAt) {
    reply.code(403).send({
      error: 'Account deactivated',
      message: 'This account has been deactivated. Please contact support.',
      deactivatedAt,
    });
    return;
  }

  // Set tenant context for the request lifecycle
  // This makes tenant available to all downstream code via getCurrentTenant()
  await tenantContext.run({ tenantId, tenant }, async () => {
    // Continue with request handling
    // The context will automatically propagate through all async operations
  });
}

/**
 * Decorator to require tenant context in a function
 * Throws error if no tenant context is available
 */
export function requiresTenant() {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const context = getCurrentTenant(); // This will throw if no context
      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}

/**
 * Utility to run code with a specific tenant context
 * Useful for background jobs and admin operations
 */
export async function runWithTenantContext<T>(
  tenantId: number,
  callback: () => Promise<T>,
): Promise<T> {
  const tenant = await Tenant.findByPk(tenantId);

  if (!tenant) {
    throw new Error(`Tenant ${tenantId} not found`);
  }

  return tenantContext.run({ tenantId, tenant }, callback);
}

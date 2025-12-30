// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

/**
 * Enhanced Health Check API
 *
 * Provides comprehensive system health monitoring endpoints for:
 * - Overall system health
 * - Database connectivity
 * - Cache connectivity (Redis/Memory)
 * - WebSocket connection health
 * - Individual station health
 *
 * @module HealthCheckApi
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ILogObj, Logger } from 'tslog';
import { ICache } from '@citrineos/base';
import { Sequelize } from 'sequelize';
import { ConnectionHealthMonitor, HealthCheckResult } from './ConnectionHealthMonitor';

export interface SystemHealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number; // seconds
  components: {
    database: ComponentHealth;
    cache: ComponentHealth;
    websocket: ComponentHealth;
    connections: HealthCheckResult;
  };
}

export interface ComponentHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  message?: string;
  responseTime?: number; // milliseconds
  details?: any;
}

export class HealthCheckApi {
  private _logger: Logger<ILogObj>;
  private _cache: ICache;
  private _sequelize: Sequelize;
  private _connectionMonitor: ConnectionHealthMonitor;
  private _startTime: Date;

  constructor(
    cache: ICache,
    sequelize: Sequelize,
    connectionMonitor: ConnectionHealthMonitor,
    logger: Logger<ILogObj>
  ) {
    this._cache = cache;
    this._sequelize = sequelize;
    this._connectionMonitor = connectionMonitor;
    this._logger = logger.getSubLogger({ name: 'HealthCheckApi' });
    this._startTime = new Date();
  }

  /**
   * Register health check routes with Fastify
   */
  registerRoutes(server: FastifyInstance): void {
    // Basic health check (fast, minimal overhead)
    server.get('/health', async (request: FastifyRequest, reply: FastifyReply) => {
      return this.basicHealthCheck(request, reply);
    });

    // Detailed health check (includes all component checks)
    server.get('/health/detailed', async (request: FastifyRequest, reply: FastifyReply) => {
      return this.detailedHealthCheck(request, reply);
    });

    // Connection health only
    server.get('/health/connections', async (request: FastifyRequest, reply: FastifyReply) => {
      return this.connectionHealthCheck(request, reply);
    });

    // Individual station health
    server.get<{
      Params: { stationId: string };
      Querystring: { tenantId?: string };
    }>(
      '/health/station/:stationId',
      async (request: FastifyRequest<{ Params: { stationId: string }; Querystring: { tenantId?: string } }>, reply: FastifyReply) => {
        return this.stationHealthCheck(request, reply);
      }
    );

    this._logger.info('Health check API routes registered');
  }

  /**
   * Basic health check - returns 200 if system is running
   */
  private async basicHealthCheck(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<any> {
    return reply.code(200).send({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - this._startTime.getTime()) / 1000)
    });
  }

  /**
   * Detailed health check - checks all components
   */
  private async detailedHealthCheck(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<any> {
    const start = Date.now();

    try {
      // Run all health checks in parallel
      const [databaseHealth, cacheHealth, connectionHealth] = await Promise.all([
        this.checkDatabaseHealth(),
        this.checkCacheHealth(),
        this.checkWebSocketHealth()
      ]);

      const connections = this._connectionMonitor.getHealthCheck();

      // Determine overall system status
      let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

      if (databaseHealth.status === 'unhealthy' || cacheHealth.status === 'unhealthy') {
        overallStatus = 'unhealthy';
      } else if (
        databaseHealth.status === 'degraded' ||
        cacheHealth.status === 'degraded' ||
        connectionHealth.status === 'degraded' ||
        connections.healthyPercentage < 80
      ) {
        overallStatus = 'degraded';
      }

      const responseTime = Date.now() - start;

      const healthStatus: SystemHealthStatus = {
        status: overallStatus,
        timestamp: new Date().toISOString(),
        uptime: Math.floor((Date.now() - this._startTime.getTime()) / 1000),
        components: {
          database: databaseHealth,
          cache: cacheHealth,
          websocket: connectionHealth,
          connections
        }
      };

      const statusCode = overallStatus === 'healthy' ? 200 : overallStatus === 'degraded' ? 503 : 500;

      this._logger.debug('Health check completed', {
        status: overallStatus,
        responseTimeMs: responseTime
      });

      return reply.code(statusCode).send(healthStatus);

    } catch (error) {
      this._logger.error('Health check failed', {
        error: error instanceof Error ? error.message : String(error)
      });

      return reply.code(500).send({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Health check failed',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Connection health check only
   */
  private async connectionHealthCheck(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<any> {
    const healthCheck = this._connectionMonitor.getHealthCheck();

    return reply.code(200).send({
      status: healthCheck.healthyPercentage >= 80 ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      ...healthCheck
    });
  }

  /**
   * Individual station health check
   */
  private async stationHealthCheck(
    request: FastifyRequest<{ Params: { stationId: string }; Querystring: { tenantId?: string } }>,
    reply: FastifyReply
  ): Promise<any> {
    const { stationId } = request.params;
    const tenantId = request.query.tenantId ? parseInt(request.query.tenantId) : 1;

    const health = this._connectionMonitor.getStationHealth(tenantId, stationId);

    if (!health) {
      return reply.code(404).send({
        status: 'not_found',
        message: `No health data found for station ${stationId}`,
        stationId,
        tenantId
      });
    }

    const status = health.isConnected && health.missedHeartbeats === 0
      ? 'healthy'
      : health.isConnected && health.missedHeartbeats > 0
      ? 'degraded'
      : 'unhealthy';

    return reply.code(200).send({
      status,
      timestamp: new Date().toISOString(),
      station: health
    });
  }

  /**
   * Check database connectivity
   */
  private async checkDatabaseHealth(): Promise<ComponentHealth> {
    const start = Date.now();

    try {
      await this._sequelize.authenticate();

      const responseTime = Date.now() - start;

      return {
        status: responseTime < 100 ? 'healthy' : 'degraded',
        message: 'Database connection successful',
        responseTime,
        details: {
          dialect: this._sequelize.getDialect(),
          poolSize: this._sequelize.config.pool?.max || 'N/A'
        }
      };
    } catch (error) {
      this._logger.error('Database health check failed', { error });

      return {
        status: 'unhealthy',
        message: 'Database connection failed',
        responseTime: Date.now() - start,
        details: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Check cache connectivity (Redis or Memory)
   */
  private async checkCacheHealth(): Promise<ComponentHealth> {
    const start = Date.now();
    const testKey = 'health-check-test';
    const testValue = Date.now().toString();

    try {
      // Try to set and get a test value
      await this._cache.set(testKey, testValue, 'HEALTH_CHECK' as any, 10);
      const retrieved = await this._cache.get(testKey, 'HEALTH_CHECK' as any);

      const responseTime = Date.now() - start;

      if (retrieved === testValue) {
        return {
          status: responseTime < 50 ? 'healthy' : 'degraded',
          message: 'Cache connection successful',
          responseTime
        };
      } else {
        return {
          status: 'degraded',
          message: 'Cache read/write mismatch',
          responseTime,
          details: { expected: testValue, received: retrieved }
        };
      }
    } catch (error) {
      this._logger.error('Cache health check failed', { error });

      return {
        status: 'unhealthy',
        message: 'Cache connection failed',
        responseTime: Date.now() - start,
        details: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Check WebSocket connection health
   */
  private async checkWebSocketHealth(): Promise<ComponentHealth> {
    const healthCheck = this._connectionMonitor.getHealthCheck();

    const status =
      healthCheck.healthyPercentage >= 95 ? 'healthy' :
      healthCheck.healthyPercentage >= 70 ? 'degraded' :
      'unhealthy';

    return {
      status,
      message: `${healthCheck.onlineStations}/${healthCheck.totalStations} stations online`,
      details: {
        totalStations: healthCheck.totalStations,
        onlineStations: healthCheck.onlineStations,
        degradedStations: healthCheck.degradedStations,
        offlineStations: healthCheck.offlineStations,
        healthyPercentage: healthCheck.healthyPercentage
      }
    };
  }
}

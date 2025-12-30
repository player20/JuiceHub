// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

/**
 * Connection Health Monitor
 *
 * Tracks WebSocket connection health and heartbeat status for charging stations.
 * Provides real-time monitoring of connection stability and automatic offline detection.
 *
 * @module ConnectionHealthMonitor
 */

import { ILogObj, Logger } from 'tslog';
import { ICache, CacheNamespace, createIdentifier } from '@citrineos/base';

export interface ConnectionHealth {
  stationId: string;
  tenantId: number;
  isConnected: boolean;
  lastHeartbeat: Date | null;
  missedHeartbeats: number;
  connectionStartTime: Date | null;
  lastDisconnect: Date | null;
  reconnectCount: number;
}

export interface HealthCheckResult {
  timestamp: Date;
  totalStations: number;
  onlineStations: number;
  offlineStations: number;
  degradedStations: number; // Connected but missing heartbeats
  healthyPercentage: number;
  stations: ConnectionHealth[];
}

export class ConnectionHealthMonitor {
  private _cache: ICache;
  private _logger: Logger<ILogObj>;
  private _heartbeatTimeout: number; // seconds
  private _maxMissedHeartbeats: number;
  private _monitoringInterval?: NodeJS.Timeout;

  // Track connection health in memory for fast access
  private _stationHealth: Map<string, ConnectionHealth> = new Map();

  constructor(
    cache: ICache,
    logger: Logger<ILogObj>,
    heartbeatTimeout: number = 120, // 2 minutes default
    maxMissedHeartbeats: number = 3
  ) {
    this._cache = cache;
    this._logger = logger.getSubLogger({ name: 'ConnectionHealthMonitor' });
    this._heartbeatTimeout = heartbeatTimeout;
    this._maxMissedHeartbeats = maxMissedHeartbeats;
  }

  /**
   * Start monitoring connection health
   * Runs periodic checks every heartbeatTimeout/2 seconds
   */
  startMonitoring(): void {
    if (this._monitoringInterval) {
      this._logger.warn('Monitoring already started');
      return;
    }

    const checkInterval = (this._heartbeatTimeout / 2) * 1000; // Check twice per timeout period
    this._monitoringInterval = setInterval(
      () => this.checkAllConnections(),
      checkInterval
    );

    this._logger.info('Connection health monitoring started', {
      checkIntervalMs: checkInterval,
      heartbeatTimeoutSeconds: this._heartbeatTimeout,
      maxMissedHeartbeats: this._maxMissedHeartbeats
    });
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this._monitoringInterval) {
      clearInterval(this._monitoringInterval);
      this._monitoringInterval = undefined;
      this._logger.info('Connection health monitoring stopped');
    }
  }

  /**
   * Record successful heartbeat from station
   */
  async recordHeartbeat(tenantId: number, stationId: string): Promise<void> {
    const identifier = createIdentifier(tenantId, stationId);
    const now = new Date();

    let health = this._stationHealth.get(identifier);

    if (!health) {
      // First heartbeat - station is connecting
      health = {
        stationId,
        tenantId,
        isConnected: true,
        lastHeartbeat: now,
        missedHeartbeats: 0,
        connectionStartTime: now,
        lastDisconnect: null,
        reconnectCount: 0
      };
    } else {
      // Update existing health record
      const wasDisconnected = !health.isConnected;

      health.lastHeartbeat = now;
      health.missedHeartbeats = 0;
      health.isConnected = true;

      if (wasDisconnected) {
        // Station reconnected
        health.reconnectCount++;
        health.connectionStartTime = now;

        this._logger.info('Station reconnected', {
          stationId,
          tenantId,
          reconnectCount: health.reconnectCount,
          downtime: health.lastDisconnect
            ? now.getTime() - health.lastDisconnect.getTime()
            : 'unknown'
        });
      }
    }

    this._stationHealth.set(identifier, health);

    // Cache heartbeat timestamp for persistence
    await this._cache.set(
      `heartbeat:${identifier}`,
      now.toISOString(),
      CacheNamespace.Connections,
      this._heartbeatTimeout * 2
    );
  }

  /**
   * Record connection established (before first heartbeat)
   */
  recordConnection(tenantId: number, stationId: string): void {
    const identifier = createIdentifier(tenantId, stationId);
    const now = new Date();

    const existing = this._stationHealth.get(identifier);

    const health: ConnectionHealth = {
      stationId,
      tenantId,
      isConnected: true,
      lastHeartbeat: existing?.lastHeartbeat || null,
      missedHeartbeats: 0,
      connectionStartTime: now,
      lastDisconnect: existing?.lastDisconnect || null,
      reconnectCount: existing ? existing.reconnectCount + 1 : 0
    };

    this._stationHealth.set(identifier, health);

    this._logger.info('Connection established', {
      stationId,
      tenantId,
      reconnectCount: health.reconnectCount
    });
  }

  /**
   * Record disconnection
   */
  recordDisconnection(tenantId: number, stationId: string): void {
    const identifier = createIdentifier(tenantId, stationId);
    const now = new Date();

    const health = this._stationHealth.get(identifier);
    if (health) {
      health.isConnected = false;
      health.lastDisconnect = now;

      const uptimeMs = health.connectionStartTime
        ? now.getTime() - health.connectionStartTime.getTime()
        : 0;

      this._logger.info('Connection closed', {
        stationId,
        tenantId,
        uptimeMs,
        reconnectCount: health.reconnectCount
      });

      this._stationHealth.set(identifier, health);
    }
  }

  /**
   * Check all connections for health issues
   */
  async checkAllConnections(): Promise<void> {
    const now = new Date();
    const checks: Promise<void>[] = [];

    for (const [identifier, health] of this._stationHealth.entries()) {
      checks.push(this._checkConnection(identifier, health, now));
    }

    await Promise.all(checks);
  }

  /**
   * Check individual connection health
   */
  private async _checkConnection(
    identifier: string,
    health: ConnectionHealth,
    now: Date
  ): Promise<void> {
    if (!health.isConnected) {
      // Already marked offline, skip
      return;
    }

    if (!health.lastHeartbeat) {
      // Connected but no heartbeat yet - waiting for BootNotification
      return;
    }

    const timeSinceHeartbeat = (now.getTime() - health.lastHeartbeat.getTime()) / 1000;

    if (timeSinceHeartbeat > this._heartbeatTimeout) {
      // Missed heartbeat
      health.missedHeartbeats++;

      this._logger.warn('Missed heartbeat detected', {
        stationId: health.stationId,
        tenantId: health.tenantId,
        missedHeartbeats: health.missedHeartbeats,
        timeSinceLastHeartbeat: timeSinceHeartbeat
      });

      if (health.missedHeartbeats >= this._maxMissedHeartbeats) {
        // Mark as offline
        health.isConnected = false;
        health.lastDisconnect = now;

        this._logger.error('Station marked offline due to missed heartbeats', {
          stationId: health.stationId,
          tenantId: health.tenantId,
          missedHeartbeats: health.missedHeartbeats
        });

        // TODO: Update database ChargingStations.isOnline = false
        // TODO: Send alert to Host via push notification / webhook
      }

      this._stationHealth.set(identifier, health);
    }
  }

  /**
   * Get health status for specific station
   */
  getStationHealth(tenantId: number, stationId: string): ConnectionHealth | null {
    const identifier = createIdentifier(tenantId, stationId);
    return this._stationHealth.get(identifier) || null;
  }

  /**
   * Get health check result for all stations
   */
  getHealthCheck(): HealthCheckResult {
    const stations = Array.from(this._stationHealth.values());

    const onlineStations = stations.filter(s => s.isConnected && s.missedHeartbeats === 0).length;
    const degradedStations = stations.filter(s => s.isConnected && s.missedHeartbeats > 0).length;
    const offlineStations = stations.filter(s => !s.isConnected).length;

    const totalStations = stations.length;
    const healthyPercentage = totalStations > 0
      ? (onlineStations / totalStations) * 100
      : 100;

    return {
      timestamp: new Date(),
      totalStations,
      onlineStations,
      offlineStations,
      degradedStations,
      healthyPercentage: Math.round(healthyPercentage * 100) / 100,
      stations
    };
  }

  /**
   * Get stations with health issues
   */
  getUnhealthyStations(): ConnectionHealth[] {
    return Array.from(this._stationHealth.values())
      .filter(s => !s.isConnected || s.missedHeartbeats > 0);
  }

  /**
   * Clean up old station records (not seen in 24 hours)
   */
  cleanupStaleRecords(maxAgeHours: number = 24): number {
    const now = new Date();
    const maxAgeMs = maxAgeHours * 60 * 60 * 1000;
    let removed = 0;

    for (const [identifier, health] of this._stationHealth.entries()) {
      const lastActivity = health.lastDisconnect || health.lastHeartbeat || health.connectionStartTime;

      if (lastActivity && (now.getTime() - lastActivity.getTime()) > maxAgeMs) {
        this._stationHealth.delete(identifier);
        removed++;
      }
    }

    if (removed > 0) {
      this._logger.info('Cleaned up stale connection records', { removed, maxAgeHours });
    }

    return removed;
  }
}

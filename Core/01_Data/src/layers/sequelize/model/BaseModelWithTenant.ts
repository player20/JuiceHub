// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import {
  BeforeCreate,
  BeforeUpdate,
  BeforeFind,
  BeforeBulkCreate,
  BeforeBulkUpdate,
  BeforeBulkDestroy,
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  Model,
} from 'sequelize-typescript';
import { DEFAULT_TENANT_ID } from '@citrineos/base';
import type { Tenant } from './Tenant';
import { FindOptions, BulkCreateOptions, UpdateOptions, DestroyOptions } from 'sequelize';

/**
 * Get current tenant from context
 * Returns null if no context (e.g., during initialization or migrations)
 */
function getCurrentTenantIdOrNull(): number | null {
  try {
    // Import dynamically to avoid circular dependency
    const { getCurrentTenantOrNull } = require('../../../02_Util/src/middleware/tenantContext');
    const context = getCurrentTenantOrNull();
    return context?.tenantId || null;
  } catch (error) {
    // Tenant context not available (e.g., during migrations or when middleware not installed)
    return null;
  }
}

/**
 * Enhanced base model for all tenant-scoped entities
 *
 * Features:
 * - Automatic tenant filtering on all queries
 * - Automatic tenantId assignment on create
 * - Cross-tenant update prevention
 * - Backward compatible with DEFAULT_TENANT_ID
 *
 * Usage:
 * ```typescript
 * @Table
 * export class ChargingStation extends BaseModelWithTenant {
 *   // Your model fields...
 * }
 * ```
 *
 * All queries will automatically be filtered by the current tenant:
 * ```typescript
 * // This query will automatically add WHERE tenantId = currentTenant.id
 * const stations = await ChargingStation.findAll();
 * ```
 *
 * To bypass tenant filtering (for admin operations):
 * ```typescript
 * const allStations = await ChargingStation.findAll({
 *   skipTenantFilter: true  // Admin only!
 * } as any);
 * ```
 */
export abstract class BaseModelWithTenant<
  TModelAttributes extends {} = any,
  TCreationAttributes extends {} = TModelAttributes,
> extends Model<TModelAttributes, TCreationAttributes> {
  @ForeignKey(() => lazyLoadModel<typeof Tenant>('Tenant'))
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    onUpdate: 'CASCADE', // update tenantId if the tenant primary key is updated (should never happen)
    onDelete: 'RESTRICT', // ensure tenant row cannot be deleted if there are existing records using it
  })
  declare tenantId: number;

  @BelongsTo(() => lazyLoadModel<typeof Tenant>('Tenant'))
  declare tenant?: Tenant;

  /**
   * Automatically add tenantId filter to all find queries
   */
  @BeforeFind
  static addTenantFilter(options: FindOptions & { skipTenantFilter?: boolean; allowNoTenant?: boolean }) {
    // Skip filter if explicitly requested (admin operations only!)
    if (options.skipTenantFilter) {
      return;
    }

    // Get current tenant ID from AsyncLocalStorage context
    const tenantId = getCurrentTenantIdOrNull();

    // If no tenant context, allow if explicitly permitted
    if (!tenantId) {
      if (!options.allowNoTenant) {
        // In production with middleware installed, this would throw
        // For backward compatibility during migration, we allow it
        console.warn(
          'No tenant context available. Consider installing tenantContextMiddleware for automatic tenant isolation.',
        );
      }
      return;
    }

    // Add tenantId to where clause
    options.where = options.where || {};

    // Handle different where clause formats
    if (typeof options.where === 'object' && !Array.isArray(options.where)) {
      (options.where as any).tenantId = tenantId;
    }
  }

  /**
   * Automatically set tenantId on create
   * Uses AsyncLocalStorage context if available, falls back to DEFAULT_TENANT_ID
   */
  @BeforeCreate
  static setTenantId(instance: BaseModelWithTenant, options: any) {
    // Skip if tenantId already set
    if (instance.tenantId != null) {
      return;
    }

    // Try to get tenant ID from AsyncLocalStorage context
    const tenantId = getCurrentTenantIdOrNull();

    if (tenantId) {
      // Use tenant from context
      instance.tenantId = tenantId;
    } else if (!options.allowNoTenant) {
      // Fall back to DEFAULT_TENANT_ID for backward compatibility
      console.warn(
        'No tenant context available. Using DEFAULT_TENANT_ID. ' +
          'Consider installing tenantContextMiddleware for proper multi-tenancy.',
      );
      instance.tenantId = DEFAULT_TENANT_ID;
    }
  }

  /**
   * Validate tenantId on update (prevent cross-tenant updates)
   */
  @BeforeUpdate
  static validateTenantOnUpdate(instance: BaseModelWithTenant) {
    const tenantId = getCurrentTenantIdOrNull();

    // Only validate if we have a tenant context
    if (tenantId && instance.tenantId !== tenantId) {
      throw new Error(
        `Cannot update record from another tenant. ` +
          `Record belongs to tenant ${instance.tenantId}, ` +
          `but current tenant is ${tenantId}.`,
      );
    }
  }

  /**
   * Automatically set tenantId on bulk create
   */
  @BeforeBulkCreate
  static setTenantIdBulk(
    instances: BaseModelWithTenant[],
    options: BulkCreateOptions & { allowNoTenant?: boolean },
  ) {
    const tenantId = getCurrentTenantIdOrNull();

    if (tenantId) {
      instances.forEach((instance) => {
        if (instance.tenantId == null) {
          instance.tenantId = tenantId;
        }
      });
    } else if (!options.allowNoTenant) {
      // Fall back to DEFAULT_TENANT_ID
      instances.forEach((instance) => {
        if (instance.tenantId == null) {
          instance.tenantId = DEFAULT_TENANT_ID;
        }
      });
    }
  }

  /**
   * Add tenantId filter to bulk update
   */
  @BeforeBulkUpdate
  static addTenantFilterBulkUpdate(
    options: UpdateOptions & { skipTenantFilter?: boolean; allowNoTenant?: boolean },
  ) {
    if (options.skipTenantFilter) {
      return;
    }

    const tenantId = getCurrentTenantIdOrNull();

    if (tenantId) {
      options.where = options.where || {};
      (options.where as any).tenantId = tenantId;
    } else if (!options.allowNoTenant) {
      console.warn('No tenant context for bulk update');
    }
  }

  /**
   * Add tenantId filter to bulk destroy
   */
  @BeforeBulkDestroy
  static addTenantFilterBulkDestroy(
    options: DestroyOptions & { skipTenantFilter?: boolean; allowNoTenant?: boolean },
  ) {
    if (options.skipTenantFilter) {
      return;
    }

    const tenantId = getCurrentTenantIdOrNull();

    if (tenantId) {
      options.where = options.where || {};
      (options.where as any).tenantId = tenantId;
    } else if (!options.allowNoTenant) {
      console.warn('No tenant context for bulk destroy');
    }
  }

  constructor(...args: any[]) {
    super(...args);
    // Fallback for backward compatibility
    if (this.tenantId == null) {
      const contextTenantId = getCurrentTenantIdOrNull();
      this.tenantId = contextTenantId || DEFAULT_TENANT_ID;
    }
  }
}

// helper method to dynamically lazy load models to avoid circular dependencies
export function lazyLoadModel<T>(modelName: string): T {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require(`./${modelName}`)[modelName] as T;
}

/**
 * Utility function to run admin queries that bypass tenant filtering
 * USE WITH EXTREME CAUTION!
 *
 * @example
 * const allStations = await runAsAdmin(() =>
 *   ChargingStation.findAll({ skipTenantFilter: true })
 * );
 */
export async function runAsAdmin<T>(callback: () => Promise<T>): Promise<T> {
  // This is a wrapper to make it clear when admin operations are happening
  // The actual bypassing is done via skipTenantFilter option
  console.warn('Running query as admin (bypassing tenant filter)');
  return callback();
}

/**
 * Type guard to check if a model uses tenant isolation
 */
export function isTenantScoped(model: any): model is typeof BaseModelWithTenant {
  return model.prototype instanceof BaseModelWithTenant;
}

// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import {
  Tenant,
  SubscriptionTier,
  BillingStatus,
  DeploymentStrategy,
  type TenantFeatures,
} from '@citrineos/data';

/**
 * Tenant provisioning request
 */
export interface TenantProvisionRequest {
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
  customFeatures?: Partial<TenantFeatures>;
}

/**
 * Service for automated tenant provisioning and management
 */
export class TenantProvisioningService {
  /**
   * Get default quotas based on subscription tier
   */
  private static getQuotasForTier(tier: SubscriptionTier): {
    maxStations: number;
    maxApiCallsPerHour: number;
    maxStorageGB: number;
    maxConcurrentSessions: number;
  } {
    const quotas = {
      [SubscriptionTier.FREE]: {
        maxStations: 5,
        maxApiCallsPerHour: 1000,
        maxStorageGB: 1,
        maxConcurrentSessions: 10,
      },
      [SubscriptionTier.STARTER]: {
        maxStations: 25,
        maxApiCallsPerHour: 10000,
        maxStorageGB: 10,
        maxConcurrentSessions: 50,
      },
      [SubscriptionTier.PROFESSIONAL]: {
        maxStations: 100,
        maxApiCallsPerHour: 50000,
        maxStorageGB: 50,
        maxConcurrentSessions: 200,
      },
      [SubscriptionTier.ENTERPRISE]: {
        maxStations: 99999,
        maxApiCallsPerHour: 999999,
        maxStorageGB: 1000,
        maxConcurrentSessions: 10000,
      },
    };

    return quotas[tier] || quotas[SubscriptionTier.FREE];
  }

  /**
   * Get default features based on subscription tier
   */
  private static getFeaturesForTier(tier: SubscriptionTier): TenantFeatures {
    const features = {
      [SubscriptionTier.FREE]: {
        analytics: false,
        revenue: false,
        alerts: true,
        smartCharging: false,
        v2g: false,
        customBranding: false,
        prioritySupport: false,
      },
      [SubscriptionTier.STARTER]: {
        analytics: true,
        revenue: true,
        alerts: true,
        smartCharging: false,
        v2g: false,
        customBranding: false,
        prioritySupport: false,
      },
      [SubscriptionTier.PROFESSIONAL]: {
        analytics: true,
        revenue: true,
        alerts: true,
        smartCharging: true,
        v2g: false,
        customBranding: false,
        prioritySupport: true,
      },
      [SubscriptionTier.ENTERPRISE]: {
        analytics: true,
        revenue: true,
        alerts: true,
        smartCharging: true,
        v2g: true,
        customBranding: true,
        prioritySupport: true,
      },
    };

    return features[tier] || features[SubscriptionTier.FREE];
  }

  /**
   * Provision a new tenant
   * This is the main entry point for tenant creation
   */
  static async provisionTenant(
    request: TenantProvisionRequest,
  ): Promise<Tenant> {
    // 1. Validate request
    if (!request.name || !request.contactEmail) {
      throw new Error('Tenant name and contact email are required');
    }

    // 2. Check if tenant name is already taken
    const existing = await Tenant.findOne({
      where: { name: request.name },
    } as any);

    if (existing) {
      throw new Error(`Tenant with name '${request.name}' already exists`);
    }

    // 3. Get quotas and features for tier
    const quotas = this.getQuotasForTier(request.subscriptionTier);
    const features = this.getFeaturesForTier(request.subscriptionTier);

    // 4. Apply custom quotas if provided (for enterprise custom plans)
    if (request.customQuotas) {
      Object.assign(quotas, request.customQuotas);
    }

    // 5. Apply custom features if provided
    if (request.customFeatures) {
      Object.assign(features, request.customFeatures);
    }

    // 6. Determine deployment strategy
    const deploymentStrategy =
      request.deploymentStrategy ||
      this.getDefaultDeploymentStrategy(request.subscriptionTier);

    // 7. Create tenant record
    const tenant = await Tenant.create({
      name: request.name,
      contactEmail: request.contactEmail,
      subscriptionTier: request.subscriptionTier,
      billingStatus: BillingStatus.ACTIVE,
      deploymentStrategy,
      ...quotas,
      currentStationCount: 0,
      currentStorageUsedGB: 0,
      apiCallsToday: 0,
      features,
      subscriptionStartDate: new Date(),
      // Free tier gets 30-day trial
      trialEndDate:
        request.subscriptionTier === SubscriptionTier.FREE
          ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          : null,
    } as any);

    // 8. Perform deployment-specific provisioning
    switch (deploymentStrategy) {
      case DeploymentStrategy.SHARED:
        // Nothing extra needed for shared deployment
        break;

      case DeploymentStrategy.DEDICATED_DB:
        await this.provisionDedicatedDatabase(tenant);
        break;

      case DeploymentStrategy.DEDICATED_INFRA:
        await this.provisionDedicatedInfrastructure(tenant, request.region);
        break;
    }

    // 9. Emit tenant.created event (for webhooks, notifications, etc.)
    await this.emitTenantEvent('tenant.created', tenant);

    // 10. Send welcome email
    await this.sendWelcomeEmail(tenant);

    return tenant;
  }

  /**
   * Get default deployment strategy for a tier
   */
  private static getDefaultDeploymentStrategy(
    tier: SubscriptionTier,
  ): DeploymentStrategy {
    switch (tier) {
      case SubscriptionTier.FREE:
      case SubscriptionTier.STARTER:
        return DeploymentStrategy.SHARED;

      case SubscriptionTier.PROFESSIONAL:
        return DeploymentStrategy.DEDICATED_DB;

      case SubscriptionTier.ENTERPRISE:
        return DeploymentStrategy.DEDICATED_INFRA;

      default:
        return DeploymentStrategy.SHARED;
    }
  }

  /**
   * Provision dedicated database for a tenant
   * TODO: Implement actual database provisioning with your cloud provider
   */
  private static async provisionDedicatedDatabase(
    tenant: Tenant,
  ): Promise<void> {
    console.log(
      `[Tenant ${tenant.id}] Provisioning dedicated database...`,
    );

    // This is a placeholder implementation
    // In production, you would:
    // 1. Create a new database on your RDS/CloudSQL instance
    // 2. Run migrations on the new database
    // 3. Store credentials in AWS Secrets Manager / Google Secret Manager
    // 4. Update tenant record with database info

    const dbName = `citrine_tenant_${tenant.id}`;

    // Store database info (in production, use actual provisioned values)
    await tenant.update({
      databaseHost: process.env.DATABASE_HOST,
      databaseName: dbName,
      databaseCredentialsSecretArn: `arn:aws:secretsmanager:us-east-1:123456789:secret:citrineos/${tenant.id}/database`,
    } as any);

    console.log(
      `[Tenant ${tenant.id}] Dedicated database provisioned: ${dbName}`,
    );
  }

  /**
   * Provision dedicated infrastructure for a tenant
   * TODO: Implement actual infrastructure provisioning
   */
  private static async provisionDedicatedInfrastructure(
    tenant: Tenant,
    region: string = 'us-east-1',
  ): Promise<void> {
    console.log(
      `[Tenant ${tenant.id}] Provisioning dedicated infrastructure in ${region}...`,
    );

    // This is a placeholder implementation
    // In production, you would use Terraform, AWS CDK, or similar to provision:
    // - Dedicated AWS account (via Organizations)
    // - VPC with subnets
    // - EKS/GKE cluster
    // - RDS/CloudSQL database
    // - ElastiCache/MemoryStore Redis
    // - Load balancer
    // - Custom domain
    // - SSL certificates

    console.log(
      `[Tenant ${tenant.id}] Dedicated infrastructure provisioned in ${region}`,
    );
  }

  /**
   * Upgrade tenant to a higher tier
   */
  static async upgradeTenant(
    tenantId: number,
    newTier: SubscriptionTier,
  ): Promise<Tenant> {
    const tenant = await Tenant.findByPk(tenantId, {
      skipTenantFilter: true,
    } as any);

    if (!tenant) {
      throw new Error('Tenant not found');
    }

    // Get new quotas and features
    const newQuotas = this.getQuotasForTier(newTier);
    const newFeatures = this.getFeaturesForTier(newTier);
    const newStrategy = this.getDefaultDeploymentStrategy(newTier);

    // Update tenant
    await tenant.update({
      subscriptionTier: newTier,
      ...newQuotas,
      features: newFeatures,
      // Don't change deployment strategy if already dedicated
      deploymentStrategy:
        tenant.deploymentStrategy !== DeploymentStrategy.SHARED
          ? tenant.deploymentStrategy
          : newStrategy,
    } as any);

    // If upgrading to dedicated DB/infra and not already dedicated
    if (
      newStrategy === DeploymentStrategy.DEDICATED_DB &&
      tenant.deploymentStrategy === DeploymentStrategy.SHARED
    ) {
      await this.migrateToDedicatedDatabase(tenant);
    }

    if (
      newStrategy === DeploymentStrategy.DEDICATED_INFRA &&
      tenant.deploymentStrategy !== DeploymentStrategy.DEDICATED_INFRA
    ) {
      await this.migrateToDedicatedInfrastructure(tenant);
    }

    await this.emitTenantEvent('tenant.upgraded', tenant);

    return tenant;
  }

  /**
   * Downgrade tenant to a lower tier
   */
  static async downgradeTenant(
    tenantId: number,
    newTier: SubscriptionTier,
  ): Promise<Tenant> {
    const tenant = await Tenant.findByPk(tenantId, {
      skipTenantFilter: true,
    } as any);

    if (!tenant) {
      throw new Error('Tenant not found');
    }

    const newQuotas = this.getQuotasForTier(newTier);
    const newFeatures = this.getFeaturesForTier(newTier);

    // Check if current usage exceeds new quotas
    if ((tenant.currentStationCount || 0) > newQuotas.maxStations) {
      throw new Error(
        `Cannot downgrade: Current station count (${tenant.currentStationCount}) ` +
          `exceeds ${newTier} tier limit (${newQuotas.maxStations})`,
      );
    }

    if ((tenant.currentStorageUsedGB || 0) > newQuotas.maxStorageGB) {
      throw new Error(
        `Cannot downgrade: Current storage usage (${tenant.currentStorageUsedGB} GB) ` +
          `exceeds ${newTier} tier limit (${newQuotas.maxStorageGB} GB)`,
      );
    }

    await tenant.update({
      subscriptionTier: newTier,
      ...newQuotas,
      features: newFeatures,
    } as any);

    await this.emitTenantEvent('tenant.downgraded', tenant);

    return tenant;
  }

  /**
   * Suspend tenant (for payment issues)
   */
  static async suspendTenant(tenantId: number): Promise<Tenant> {
    const tenant = await Tenant.findByPk(tenantId, {
      skipTenantFilter: true,
    } as any);

    if (!tenant) {
      throw new Error('Tenant not found');
    }

    await tenant.update({
      billingStatus: BillingStatus.SUSPENDED,
    } as any);

    await this.emitTenantEvent('tenant.suspended', tenant);

    return tenant;
  }

  /**
   * Reactivate suspended tenant
   */
  static async reactivateTenant(tenantId: number): Promise<Tenant> {
    const tenant = await Tenant.findByPk(tenantId, {
      skipTenantFilter: true,
    } as any);

    if (!tenant) {
      throw new Error('Tenant not found');
    }

    await tenant.update({
      billingStatus: BillingStatus.ACTIVE,
    } as any);

    await this.emitTenantEvent('tenant.reactivated', tenant);

    return tenant;
  }

  /**
   * Deactivate tenant (offboarding)
   */
  static async deactivateTenant(tenantId: number): Promise<Tenant> {
    const tenant = await Tenant.findByPk(tenantId, {
      skipTenantFilter: true,
    } as any);

    if (!tenant) {
      throw new Error('Tenant not found');
    }

    await tenant.update({
      billingStatus: BillingStatus.CANCELED,
      deactivatedAt: new Date(),
    } as any);

    await this.emitTenantEvent('tenant.deactivated', tenant);

    return tenant;
  }

  /**
   * Migrate tenant to dedicated database
   */
  private static async migrateToDedicatedDatabase(
    tenant: Tenant,
  ): Promise<void> {
    console.log(`[Tenant ${tenant.id}] Migrating to dedicated database...`);
    // TODO: Implement data migration
    await this.provisionDedicatedDatabase(tenant);
  }

  /**
   * Migrate tenant to dedicated infrastructure
   */
  private static async migrateToDedicatedInfrastructure(
    tenant: Tenant,
  ): Promise<void> {
    console.log(
      `[Tenant ${tenant.id}] Migrating to dedicated infrastructure...`,
    );
    // TODO: Implement infrastructure migration
    await this.provisionDedicatedInfrastructure(tenant);
  }

  /**
   * Emit tenant lifecycle event
   * Override this to integrate with your event system
   */
  private static async emitTenantEvent(
    event: string,
    tenant: Tenant,
  ): Promise<void> {
    console.log(`[Event] ${event} for tenant ${tenant.id}:${tenant.name}`);

    // TODO: Integrate with your message broker (RabbitMQ, etc.)
    // await messageBroker.publish(event, { tenantId: tenant.id, tenant });
  }

  /**
   * Send welcome email to new tenant
   * Override this to integrate with your email service
   */
  private static async sendWelcomeEmail(tenant: Tenant): Promise<void> {
    console.log(`[Email] Sending welcome email to ${tenant.contactEmail}`);

    // TODO: Integrate with your email service (SendGrid, AWS SES, etc.)
    // await emailService.send({
    //   to: tenant.contactEmail,
    //   subject: 'Welcome to CitrineOS!',
    //   template: 'welcome',
    //   data: { tenantName: tenant.name }
    // });
  }
}

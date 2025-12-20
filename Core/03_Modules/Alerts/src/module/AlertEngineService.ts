/**
 * Alert Engine Service
 *
 * Evaluates alert rules and triggers notifications
 * No external API keys required for core functionality
 */

import { ILogger } from '@citrineos/base';
import { SequelizeRepository } from '@citrineos/data';
import { subMinutes } from 'date-fns';
import {
  AlertsConfig,
  DEFAULT_ALERTS_CONFIG,
  AlertRule,
  AlertInstance,
  AlertCondition,
  AlertAction,
} from './interfaces';
import { NotificationService } from './NotificationService';

export class AlertEngineService {
  private readonly logger: ILogger;
  private readonly repository: SequelizeRepository;
  private readonly config: AlertsConfig;
  private readonly notifications: NotificationService;

  constructor(
    logger: ILogger,
    repository: SequelizeRepository,
    notifications: NotificationService,
    config: AlertsConfig = DEFAULT_ALERTS_CONFIG
  ) {
    this.logger = logger;
    this.repository = repository;
    this.config = config;
    this.notifications = notifications;
  }

  /**
   * Evaluate all active alert rules
   *
   * Should be run periodically (e.g., every 5 minutes via cron)
   */
  async evaluateAllRules(): Promise<{
    evaluated: number;
    triggered: number;
  }> {
    try {
      this.logger.info('Evaluating all alert rules...');

      // Get all enabled rules
      const rules = await this.repository.readOnlyDbConnection.models.alert_rules.findAll({
        where: { enabled: true },
      });

      let triggered = 0;

      for (const rule of rules) {
        try {
          const wasTriggered = await this.evaluateRule(rule as AlertRule);
          if (wasTriggered) triggered++;
        } catch (error) {
          this.logger.error(`Failed to evaluate rule ${rule.id}`, error);
        }
      }

      this.logger.info(
        `Evaluated ${rules.length} rules, triggered ${triggered} alerts`
      );

      return {
        evaluated: rules.length,
        triggered,
      };
    } catch (error) {
      this.logger.error('Failed to evaluate alert rules', error);
      return { evaluated: 0, triggered: 0 };
    }
  }

  /**
   * Evaluate a specific alert rule
   *
   * @param rule Alert rule to evaluate
   * @returns True if alert was triggered
   */
  async evaluateRule(rule: AlertRule): Promise<boolean> {
    try {
      // Check cooldown period
      if (!(await this.checkCooldown(rule))) {
        return false;
      }

      // Evaluate conditions based on rule type
      const entities = await this.getEntitiesForRule(rule);

      for (const entity of entities) {
        const conditionsMet = this.evaluateConditions(entity, rule.conditions);

        if (conditionsMet) {
          await this.triggerAlert(rule, entity);
          return true;
        }
      }

      return false;
    } catch (error) {
      this.logger.error(`Failed to evaluate rule ${rule.id}`, error);
      return false;
    }
  }

  /**
   * Manually trigger an alert
   *
   * @param ruleId Alert rule ID
   * @param entityId Entity that triggered the alert
   * @param message Custom message
   */
  async triggerManualAlert(
    ruleId: string,
    entityId: string,
    message?: string
  ): Promise<AlertInstance | null> {
    try {
      const rule = await this.repository.readOnlyDbConnection.models.alert_rules.findOne({
        where: { id: ruleId },
      });

      if (!rule) {
        throw new Error('Alert rule not found');
      }

      return await this.triggerAlert(rule as AlertRule, { id: entityId }, message);
    } catch (error) {
      this.logger.error('Failed to trigger manual alert', error);
      throw error;
    }
  }

  /**
   * Acknowledge an alert
   *
   * @param alertInstanceId Alert instance ID
   * @param userId User who acknowledged
   */
  async acknowledgeAlert(
    alertInstanceId: string,
    userId: string
  ): Promise<AlertInstance | null> {
    try {
      await this.repository.readOnlyDbConnection.models.alert_instances.update(
        {
          status: 'acknowledged',
          acknowledgedBy: userId,
          acknowledgedAt: new Date(),
          updatedAt: new Date(),
        },
        { where: { id: alertInstanceId } }
      );

      this.logger.info(`Alert ${alertInstanceId} acknowledged by user ${userId}`);

      const [instance] = await this.repository.readOnlyDbConnection.models.alert_instances.findOne({
        where: { id: alertInstanceId },
      });

      return instance as AlertInstance;
    } catch (error) {
      this.logger.error(`Failed to acknowledge alert ${alertInstanceId}`, error);
      throw error;
    }
  }

  /**
   * Resolve an alert
   *
   * @param alertInstanceId Alert instance ID
   */
  async resolveAlert(alertInstanceId: string): Promise<AlertInstance | null> {
    try {
      await this.repository.readOnlyDbConnection.models.alert_instances.update(
        {
          status: 'resolved',
          resolvedAt: new Date(),
          updatedAt: new Date(),
        },
        { where: { id: alertInstanceId } }
      );

      this.logger.info(`Alert ${alertInstanceId} resolved`);

      const [instance] = await this.repository.readOnlyDbConnection.models.alert_instances.findOne({
        where: { id: alertInstanceId },
      });

      return instance as AlertInstance;
    } catch (error) {
      this.logger.error(`Failed to resolve alert ${alertInstanceId}`, error);
      throw error;
    }
  }

  /**
   * Get active alerts
   *
   * @param tenantId Optional tenant filter
   * @returns Active alert instances
   */
  async getActiveAlerts(tenantId?: string): Promise<AlertInstance[]> {
    try {
      const where: any = { status: 'active' };
      if (tenantId) {
        where.tenantId = tenantId;
      }

      const alerts = await this.repository.readOnlyDbConnection.models.alert_instances.findAll({
        where,
        order: [['triggeredAt', 'DESC']],
      });

      return alerts as AlertInstance[];
    } catch (error) {
      this.logger.error('Failed to get active alerts', error);
      return [];
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private async checkCooldown(rule: AlertRule): Promise<boolean> {
    const cooldownMinutes = rule.cooldownMinutes || this.config.defaultCooldownMinutes;
    const cutoff = subMinutes(new Date(), cooldownMinutes);

    const recentAlert = await this.repository.readOnlyDbConnection.models.alert_instances.findOne({
      where: {
        ruleId: rule.id,
        triggeredAt: { $gte: cutoff },
      },
    });

    if (recentAlert) {
      this.logger.debug(
        `Rule ${rule.id} in cooldown period (${cooldownMinutes} minutes)`
      );
      return false;
    }

    return true;
  }

  private async getEntitiesForRule(rule: AlertRule): Promise<any[]> {
    let query = '';

    switch (rule.type) {
      case 'station_offline':
      case 'low_health_score':
      case 'connector_unavailable':
        query = `
          SELECT cs.*, spd.health_score, spd.uptime_percentage
          FROM "ChargingStations" cs
          LEFT JOIN station_performance_daily spd ON cs.id = spd.charging_station_id
            AND spd.date = CURRENT_DATE
          WHERE cs.registration_status = 'Accepted'
        `;
        break;

      case 'charging_fault':
        query = `
          SELECT t.*, cs.station_id
          FROM "Transactions" t
          INNER JOIN "ChargingStations" cs ON t.charging_station_id = cs.id
          WHERE t.stop_reason LIKE '%Error%' OR t.stop_reason LIKE '%Fault%'
          AND t.time_end >= NOW() - INTERVAL '1 hour'
        `;
        break;

      case 'payment_failed':
        query = `
          SELECT p.*, u.email, u.phone
          FROM payments p
          LEFT JOIN "Users" u ON p.user_id = u.id
          WHERE p.status = 'failed'
          AND p.created_at >= NOW() - INTERVAL '1 hour'
        `;
        break;

      default:
        return [];
    }

    try {
      const results = await this.repository.readOnlyDbConnection.query(query, {
        type: 'SELECT',
      });

      return results;
    } catch (error) {
      this.logger.error(`Failed to get entities for rule ${rule.type}`, error);
      return [];
    }
  }

  private evaluateConditions(
    entity: any,
    conditions: AlertCondition[]
  ): boolean {
    return conditions.every((condition) => {
      const entityValue = entity[condition.field];

      switch (condition.operator) {
        case 'eq':
          return entityValue === condition.value;
        case 'ne':
          return entityValue !== condition.value;
        case 'gt':
          return Number(entityValue) > Number(condition.value);
        case 'gte':
          return Number(entityValue) >= Number(condition.value);
        case 'lt':
          return Number(entityValue) < Number(condition.value);
        case 'lte':
          return Number(entityValue) <= Number(condition.value);
        case 'contains':
          return String(entityValue).includes(String(condition.value));
        default:
          return false;
      }
    });
  }

  private async triggerAlert(
    rule: AlertRule,
    entity: any,
    customMessage?: string
  ): Promise<AlertInstance> {
    // Create alert instance
    const message =
      customMessage || this.generateAlertMessage(rule, entity);

    const alertInstance: Partial<AlertInstance> = {
      ruleId: rule.id,
      tenantId: rule.tenantId,
      triggeredAt: new Date(),
      status: 'active',
      entityType: this.getEntityType(rule.type),
      entityId: entity.id,
      message,
      metadata: this.extractMetadata(entity),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const [instance] = await this.repository.readOnlyDbConnection.models.alert_instances.create(
      alertInstance
    );

    this.logger.warn(`Alert triggered: ${rule.name} - ${message}`);

    // Execute alert actions
    await this.executeActions(rule.actions, instance as AlertInstance);

    return instance as AlertInstance;
  }

  private async executeActions(
    actions: AlertAction[],
    alertInstance: AlertInstance
  ): Promise<void> {
    for (const action of actions) {
      try {
        switch (action.type) {
          case 'email':
            await this.sendEmailNotifications(action, alertInstance);
            break;
          case 'sms':
            await this.sendSMSNotifications(action, alertInstance);
            break;
          case 'webhook':
            await this.sendWebhookNotifications(action, alertInstance);
            break;
          case 'log':
            this.logger.warn(
              `[ALERT] ${alertInstance.message}`,
              alertInstance.metadata
            );
            break;
        }
      } catch (error) {
        this.logger.error(`Failed to execute action ${action.type}`, error);
      }
    }
  }

  private async sendEmailNotifications(
    action: AlertAction,
    alertInstance: AlertInstance
  ): Promise<void> {
    if (!action.recipients || action.recipients.length === 0) {
      this.logger.warn('No email recipients specified for alert action');
      return;
    }

    for (const recipient of action.recipients) {
      await this.notifications.sendNotification({
        channel: 'email',
        recipient,
        subject: `JuiceHub Alert: ${alertInstance.message}`,
        message: this.formatAlertMessage(alertInstance),
        alertInstanceId: alertInstance.id,
        tenantId: alertInstance.tenantId,
      });
    }
  }

  private async sendSMSNotifications(
    action: AlertAction,
    alertInstance: AlertInstance
  ): Promise<void> {
    if (!action.recipients || action.recipients.length === 0) {
      this.logger.warn('No SMS recipients specified for alert action');
      return;
    }

    for (const recipient of action.recipients) {
      await this.notifications.sendNotification({
        channel: 'sms',
        recipient,
        message: alertInstance.message,
        alertInstanceId: alertInstance.id,
        tenantId: alertInstance.tenantId,
      });
    }
  }

  private async sendWebhookNotifications(
    action: AlertAction,
    alertInstance: AlertInstance
  ): Promise<void> {
    if (!action.webhookUrl) {
      this.logger.warn('No webhook URL specified for alert action');
      return;
    }

    await this.notifications.sendNotification({
      channel: 'webhook',
      recipient: action.webhookUrl,
      message: JSON.stringify(alertInstance),
      alertInstanceId: alertInstance.id,
      tenantId: alertInstance.tenantId,
    });
  }

  private generateAlertMessage(rule: AlertRule, entity: any): string {
    const entityId = entity.station_id || entity.id || 'Unknown';

    switch (rule.type) {
      case 'station_offline':
        return `Station ${entityId} is offline`;
      case 'low_health_score':
        return `Station ${entityId} has low health score: ${entity.health_score}`;
      case 'charging_fault':
        return `Charging fault detected at station ${entityId}: ${entity.stop_reason}`;
      case 'payment_failed':
        return `Payment failed for user ${entity.user_id}: ${entity.failure_reason}`;
      case 'high_error_rate':
        return `High error rate detected at station ${entityId}`;
      case 'connector_unavailable':
        return `Connector unavailable at station ${entityId}`;
      default:
        return `Alert triggered: ${rule.name}`;
    }
  }

  private getEntityType(
    alertType: string
  ): 'station' | 'connector' | 'transaction' | 'payment' | 'system' {
    switch (alertType) {
      case 'station_offline':
      case 'low_health_score':
      case 'high_error_rate':
        return 'station';
      case 'connector_unavailable':
        return 'connector';
      case 'charging_fault':
        return 'transaction';
      case 'payment_failed':
        return 'payment';
      default:
        return 'system';
    }
  }

  private extractMetadata(entity: any): Record<string, any> {
    // Extract relevant fields for metadata
    const metadata: Record<string, any> = {};

    const fields = [
      'health_score',
      'uptime_percentage',
      'stop_reason',
      'failure_reason',
      'error_code',
      'station_id',
    ];

    for (const field of fields) {
      if (entity[field] !== undefined) {
        metadata[field] = entity[field];
      }
    }

    return metadata;
  }

  private formatAlertMessage(alertInstance: AlertInstance): string {
    let message = `${alertInstance.message}\n\n`;
    message += `Triggered at: ${alertInstance.triggeredAt.toLocaleString()}\n`;
    message += `Entity: ${alertInstance.entityType} (${alertInstance.entityId})\n`;

    if (alertInstance.metadata && Object.keys(alertInstance.metadata).length > 0) {
      message += '\nAdditional Details:\n';
      for (const [key, value] of Object.entries(alertInstance.metadata)) {
        message += `- ${key}: ${value}\n`;
      }
    }

    return message;
  }
}

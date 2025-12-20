/**
 * Alert Rule Service
 *
 * Handles CRUD operations for alert rules
 * No external API keys required
 */

import { ILogger } from '@citrineos/base';
import { SequelizeRepository } from '@citrineos/data';
import {
  AlertRule,
  CreateAlertRuleRequest,
  AlertsConfig,
  DEFAULT_ALERTS_CONFIG,
} from './interfaces';

export class AlertRuleService {
  private readonly logger: ILogger;
  private readonly repository: SequelizeRepository;
  private readonly config: AlertsConfig;

  constructor(
    logger: ILogger,
    repository: SequelizeRepository,
    config: AlertsConfig = DEFAULT_ALERTS_CONFIG
  ) {
    this.logger = logger;
    this.repository = repository;
    this.config = config;
  }

  /**
   * Create new alert rule
   *
   * @param request Alert rule details
   * @returns Created alert rule
   */
  async createRule(request: CreateAlertRuleRequest): Promise<AlertRule> {
    try {
      this.logger.info(`Creating alert rule: ${request.name}`);

      const rule: Partial<AlertRule> = {
        tenantId: request.tenantId,
        name: request.name,
        description: request.description,
        type: request.type,
        severity: request.severity,
        enabled: true,
        conditions: request.conditions,
        actions: request.actions,
        cooldownMinutes: request.cooldownMinutes || this.config.defaultCooldownMinutes,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const [created] = await this.repository.readOnlyDbConnection.models.alert_rules.create(
        rule
      );

      this.logger.info(`Alert rule created: ${created.id}`);

      return created as AlertRule;
    } catch (error) {
      this.logger.error('Failed to create alert rule', error);
      throw error;
    }
  }

  /**
   * Get alert rule by ID
   *
   * @param ruleId Rule ID
   * @returns Alert rule
   */
  async getRule(ruleId: string): Promise<AlertRule | null> {
    try {
      const rule = await this.repository.readOnlyDbConnection.models.alert_rules.findOne({
        where: { id: ruleId },
      });

      return rule as AlertRule | null;
    } catch (error) {
      this.logger.error(`Failed to get alert rule ${ruleId}`, error);
      return null;
    }
  }

  /**
   * Get all alert rules
   *
   * @param tenantId Optional tenant filter
   * @returns List of alert rules
   */
  async getRules(tenantId?: string): Promise<AlertRule[]> {
    try {
      const where: any = {};
      if (tenantId) {
        where.tenantId = tenantId;
      }

      const rules = await this.repository.readOnlyDbConnection.models.alert_rules.findAll({
        where,
        order: [['createdAt', 'DESC']],
      });

      return rules as AlertRule[];
    } catch (error) {
      this.logger.error('Failed to get alert rules', error);
      return [];
    }
  }

  /**
   * Update alert rule
   *
   * @param ruleId Rule ID
   * @param updates Fields to update
   * @returns Updated rule
   */
  async updateRule(
    ruleId: string,
    updates: Partial<Omit<AlertRule, 'id' | 'createdAt'>>
  ): Promise<AlertRule | null> {
    try {
      await this.repository.readOnlyDbConnection.models.alert_rules.update(
        {
          ...updates,
          updatedAt: new Date(),
        },
        { where: { id: ruleId } }
      );

      this.logger.info(`Alert rule updated: ${ruleId}`);

      return await this.getRule(ruleId);
    } catch (error) {
      this.logger.error(`Failed to update alert rule ${ruleId}`, error);
      throw error;
    }
  }

  /**
   * Enable/disable alert rule
   *
   * @param ruleId Rule ID
   * @param enabled Enable or disable
   * @returns Updated rule
   */
  async toggleRule(ruleId: string, enabled: boolean): Promise<AlertRule | null> {
    try {
      await this.repository.readOnlyDbConnection.models.alert_rules.update(
        {
          enabled,
          updatedAt: new Date(),
        },
        { where: { id: ruleId } }
      );

      this.logger.info(`Alert rule ${enabled ? 'enabled' : 'disabled'}: ${ruleId}`);

      return await this.getRule(ruleId);
    } catch (error) {
      this.logger.error(`Failed to toggle alert rule ${ruleId}`, error);
      throw error;
    }
  }

  /**
   * Delete alert rule
   *
   * @param ruleId Rule ID
   */
  async deleteRule(ruleId: string): Promise<void> {
    try {
      await this.repository.readOnlyDbConnection.models.alert_rules.destroy({
        where: { id: ruleId },
      });

      this.logger.info(`Alert rule deleted: ${ruleId}`);
    } catch (error) {
      this.logger.error(`Failed to delete alert rule ${ruleId}`, error);
      throw error;
    }
  }

  /**
   * Create default alert rules for a tenant
   *
   * @param tenantId Tenant ID
   * @returns Created rules
   */
  async createDefaultRules(tenantId?: string): Promise<AlertRule[]> {
    try {
      this.logger.info('Creating default alert rules...');

      const defaultRules: CreateAlertRuleRequest[] = [
        {
          tenantId,
          name: 'Station Offline',
          description: 'Alert when a charging station goes offline',
          type: 'station_offline',
          severity: 'error',
          conditions: [
            {
              field: 'registration_status',
              operator: 'ne',
              value: 'Accepted',
            },
          ],
          actions: [
            { type: 'log' },
            { type: 'in_app', recipients: [] },
          ],
          cooldownMinutes: 30,
        },
        {
          tenantId,
          name: 'Low Health Score',
          description: 'Alert when station health score drops below 70',
          type: 'low_health_score',
          severity: 'warning',
          conditions: [
            {
              field: 'health_score',
              operator: 'lt',
              value: 70,
            },
          ],
          actions: [
            { type: 'log' },
            { type: 'in_app', recipients: [] },
          ],
          cooldownMinutes: 60,
        },
        {
          tenantId,
          name: 'Charging Fault',
          description: 'Alert when a charging session ends with an error',
          type: 'charging_fault',
          severity: 'error',
          conditions: [
            {
              field: 'stop_reason',
              operator: 'contains',
              value: 'Error',
            },
          ],
          actions: [
            { type: 'log' },
            { type: 'in_app', recipients: [] },
          ],
          cooldownMinutes: 15,
        },
        {
          tenantId,
          name: 'Payment Failed',
          description: 'Alert when a payment fails',
          type: 'payment_failed',
          severity: 'error',
          conditions: [
            {
              field: 'status',
              operator: 'eq',
              value: 'failed',
            },
          ],
          actions: [
            { type: 'log' },
            { type: 'in_app', recipients: [] },
          ],
          cooldownMinutes: 30,
        },
      ];

      const rules: AlertRule[] = [];

      for (const ruleData of defaultRules) {
        const rule = await this.createRule(ruleData);
        rules.push(rule);
      }

      this.logger.info(`Created ${rules.length} default alert rules`);

      return rules;
    } catch (error) {
      this.logger.error('Failed to create default alert rules', error);
      throw error;
    }
  }
}

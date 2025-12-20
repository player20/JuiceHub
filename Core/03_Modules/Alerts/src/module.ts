/**
 * Alerts Module
 *
 * Main module that wires together all alert and notification services
 * Provides unified interface for alerts, notifications, and incident management
 *
 * Email Notifications (Optional):
 * - Set SENDGRID_API_KEY in environment to enable email
 * - Set SENDGRID_FROM_EMAIL for sender address
 * - Set SENDGRID_FROM_NAME for sender name (optional)
 *
 * SMS Notifications (Optional):
 * - Set TWILIO_ACCOUNT_SID in environment
 * - Set TWILIO_AUTH_TOKEN in environment
 * - Set TWILIO_PHONE_NUMBER for SMS sender
 *
 * If notification providers are not configured, the module will:
 * - Create notification records in database
 * - Log notifications to console
 * - Disable actual email/SMS sending
 */

import { ILogger } from '@citrineos/base';
import { SequelizeRepository } from '@citrineos/data';
import {
  AlertsConfig,
  DEFAULT_ALERTS_CONFIG,
} from './module/interfaces';
import { NotificationService } from './module/NotificationService';
import { AlertEngineService } from './module/AlertEngineService';
import { AlertRuleService } from './module/AlertRuleService';
import { IncidentService } from './module/IncidentService';

/**
 * Alerts Module
 *
 * Provides comprehensive alerting and incident management:
 * - Alert rule evaluation and triggering
 * - Multi-channel notifications (email, SMS, webhook, in-app)
 * - Incident tracking and management
 * - Alert cooldown and rate limiting
 */
export class AlertsModule {
  private readonly logger: ILogger;
  private readonly repository: SequelizeRepository;
  private readonly config: AlertsConfig;

  public readonly notifications: NotificationService;
  public readonly alertEngine: AlertEngineService;
  public readonly rules: AlertRuleService;
  public readonly incidents: IncidentService;

  constructor(
    logger: ILogger,
    repository: SequelizeRepository,
    config: AlertsConfig = DEFAULT_ALERTS_CONFIG
  ) {
    this.logger = logger;
    this.repository = repository;
    this.config = config;

    // Initialize services
    this.notifications = new NotificationService(logger, repository, config);
    this.alertEngine = new AlertEngineService(
      logger,
      repository,
      this.notifications,
      config
    );
    this.rules = new AlertRuleService(logger, repository, config);
    this.incidents = new IncidentService(logger, repository, config);

    // Log module status
    const emailStatus = this.notifications.isEmailEnabled()
      ? 'enabled'
      : 'disabled (SendGrid not configured)';
    const smsStatus = this.notifications.isSMSEnabled()
      ? 'enabled'
      : 'disabled (Twilio not configured or disabled in config)';

    this.logger.info(
      `Alerts Module initialized - Email: ${emailStatus}, SMS: ${smsStatus}`
    );
  }

  /**
   * Run periodic alert evaluation
   *
   * Should be scheduled to run every 5-15 minutes via cron job
   */
  async runAlertEvaluation(): Promise<void> {
    try {
      this.logger.info('Starting periodic alert evaluation...');

      const { evaluated, triggered } = await this.alertEngine.evaluateAllRules();

      this.logger.info(
        `Alert evaluation complete: ${evaluated} rules evaluated, ${triggered} alerts triggered`
      );
    } catch (error) {
      this.logger.error('Failed to run alert evaluation', error);
      throw error;
    }
  }

  /**
   * Initialize default alert rules for a tenant
   *
   * Creates standard alert rules for common scenarios
   *
   * @param tenantId Optional tenant ID
   */
  async initializeDefaultRules(tenantId?: string): Promise<void> {
    try {
      this.logger.info('Initializing default alert rules...');

      await this.rules.createDefaultRules(tenantId);

      this.logger.info('Default alert rules created successfully');
    } catch (error) {
      this.logger.error('Failed to initialize default alert rules', error);
      throw error;
    }
  }

  /**
   * Get alerts dashboard data
   *
   * Optimized method for alerts overview page
   */
  async getAlertsDashboard(tenantId?: string): Promise<{
    activeAlerts: Awaited<ReturnType<typeof this.alertEngine.getActiveAlerts>>;
    incidentStats: Awaited<ReturnType<typeof this.incidents.getStatistics>>;
    openIncidents: Awaited<ReturnType<typeof this.incidents.getIncidents>>;
  }> {
    try {
      this.logger.info('Fetching alerts dashboard data...');

      const [activeAlerts, incidentStats, openIncidents] = await Promise.all([
        this.alertEngine.getActiveAlerts(tenantId),
        this.incidents.getStatistics(tenantId),
        this.incidents.getIncidents(tenantId, 'open'),
      ]);

      this.logger.info('Alerts dashboard data retrieved successfully');

      return {
        activeAlerts,
        incidentStats,
        openIncidents,
      };
    } catch (error) {
      this.logger.error('Failed to get alerts dashboard', error);
      throw error;
    }
  }

  /**
   * Health check for alerts module
   *
   * Verifies database connectivity and notification provider configuration
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    databaseConnected: boolean;
    emailEnabled: boolean;
    smsEnabled: boolean;
    message: string;
  }> {
    try {
      // Test database connection
      await this.repository.readOnlyDbConnection.query('SELECT 1', {
        type: 'SELECT',
      });

      const emailEnabled = this.notifications.isEmailEnabled();
      const smsEnabled = this.notifications.isSMSEnabled();

      let message = 'Alerts module is healthy';

      if (!emailEnabled && !smsEnabled) {
        message += ' (no notification providers configured - alerts will log only)';
      } else {
        const providers = [];
        if (emailEnabled) providers.push('email');
        if (smsEnabled) providers.push('SMS');
        message += ` (${providers.join(' and ')} notifications enabled)`;
      }

      return {
        healthy: true,
        databaseConnected: true,
        emailEnabled,
        smsEnabled,
        message,
      };
    } catch (error) {
      this.logger.error('Alerts module health check failed', error);
      return {
        healthy: false,
        databaseConnected: false,
        emailEnabled: false,
        smsEnabled: false,
        message: `Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Check notification provider status
   */
  public getNotificationStatus(): {
    email: boolean;
    sms: boolean;
  } {
    return {
      email: this.notifications.isEmailEnabled(),
      sms: this.notifications.isSMSEnabled(),
    };
  }
}

/**
 * Factory function to create Alerts Module instance
 */
export function createAlertsModule(
  logger: ILogger,
  repository: SequelizeRepository,
  config?: AlertsConfig
): AlertsModule {
  return new AlertsModule(logger, repository, config);
}

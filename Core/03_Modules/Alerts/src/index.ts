/**
 * Alerts Module - Public API
 *
 * Exports all public interfaces, services, and utilities
 */

// Main module
export { AlertsModule, createAlertsModule } from './module';

// Services
export { NotificationService } from './module/NotificationService';
export { AlertEngineService } from './module/AlertEngineService';
export { AlertRuleService } from './module/AlertRuleService';
export { IncidentService } from './module/IncidentService';

// Interfaces and types
export type {
  // Alert Rules
  AlertType,
  AlertSeverity,
  AlertRule,
  AlertCondition,
  AlertAction,
  CreateAlertRuleRequest,

  // Alert Instances
  AlertInstance,

  // Notifications
  NotificationChannel,
  NotificationStatus,
  Notification,
  SendNotificationRequest,

  // Incidents
  IncidentStatus,
  IncidentSeverity,
  Incident,
  IncidentNote,
  CreateIncidentRequest,

  // Configuration
  AlertsConfig,
  SendGridConfig,
  TwilioConfig,
  WebhookConfig,
} from './module/interfaces';

// Default configuration
export { DEFAULT_ALERTS_CONFIG } from './module/interfaces';

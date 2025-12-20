/**
 * Alerts Module - TypeScript Interfaces
 *
 * Defines types for alerts, notifications, and incidents
 */

// ============================================================================
// ALERT RULES
// ============================================================================

export type AlertType =
  | 'station_offline'
  | 'low_health_score'
  | 'charging_fault'
  | 'payment_failed'
  | 'high_error_rate'
  | 'connector_unavailable'
  | 'custom';

export type AlertSeverity = 'info' | 'warning' | 'error' | 'critical';

export interface AlertRule {
  id: string;
  tenantId?: string;
  name: string;
  description?: string;
  type: AlertType;
  severity: AlertSeverity;
  enabled: boolean;
  conditions: AlertCondition[];
  actions: AlertAction[];
  cooldownMinutes: number; // Prevent alert spam
  createdAt: Date;
  updatedAt: Date;
}

export interface AlertCondition {
  field: string; // e.g., "health_score", "uptime_percentage", "error_count"
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains';
  value: string | number | boolean;
}

export interface AlertAction {
  type: 'email' | 'sms' | 'webhook' | 'log';
  recipients?: string[]; // Email addresses or phone numbers
  webhookUrl?: string;
  template?: string;
}

export interface CreateAlertRuleRequest {
  tenantId?: string;
  name: string;
  description?: string;
  type: AlertType;
  severity: AlertSeverity;
  conditions: AlertCondition[];
  actions: AlertAction[];
  cooldownMinutes?: number;
}

// ============================================================================
// ALERT INSTANCES
// ============================================================================

export interface AlertInstance {
  id: string;
  ruleId: string;
  tenantId?: string;
  triggeredAt: Date;
  resolvedAt?: Date;
  status: 'active' | 'resolved' | 'acknowledged';
  entityType: 'station' | 'connector' | 'transaction' | 'payment' | 'system';
  entityId?: string;
  message: string;
  metadata?: Record<string, any>;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// NOTIFICATIONS
// ============================================================================

export type NotificationChannel = 'email' | 'sms' | 'webhook' | 'in_app';

export type NotificationStatus =
  | 'pending'
  | 'sent'
  | 'delivered'
  | 'failed'
  | 'bounced';

export interface Notification {
  id: string;
  tenantId?: string;
  alertInstanceId?: string;
  channel: NotificationChannel;
  recipient: string; // Email, phone, or user ID
  subject?: string;
  message: string;
  status: NotificationStatus;
  sentAt?: Date;
  deliveredAt?: Date;
  failureReason?: string;
  externalId?: string; // SendGrid message ID, Twilio SID, etc.
  createdAt: Date;
  updatedAt: Date;
}

export interface SendNotificationRequest {
  channel: NotificationChannel;
  recipient: string;
  subject?: string;
  message: string;
  alertInstanceId?: string;
  tenantId?: string;
}

// ============================================================================
// INCIDENTS
// ============================================================================

export type IncidentStatus =
  | 'open'
  | 'investigating'
  | 'identified'
  | 'monitoring'
  | 'resolved'
  | 'closed';

export type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface Incident {
  id: string;
  tenantId?: string;
  title: string;
  description: string;
  status: IncidentStatus;
  severity: IncidentSeverity;
  entityType: 'station' | 'connector' | 'system';
  entityId?: string;
  alertInstances: string[]; // Related alert IDs
  startedAt: Date;
  resolvedAt?: Date;
  assignedTo?: string;
  notes?: IncidentNote[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IncidentNote {
  id: string;
  incidentId: string;
  userId: string;
  content: string;
  createdAt: Date;
}

export interface CreateIncidentRequest {
  tenantId?: string;
  title: string;
  description: string;
  severity: IncidentSeverity;
  entityType: 'station' | 'connector' | 'system';
  entityId?: string;
  alertInstanceIds?: string[];
}

// ============================================================================
// CONFIGURATION
// ============================================================================

export interface AlertsConfig {
  emailEnabled: boolean;
  smsEnabled: boolean;
  webhooksEnabled: boolean;
  defaultCooldownMinutes: number;
  maxAlertsPerHour: number;
  autoCreateIncidents: boolean;
  incidentThreshold: number; // Number of alerts to auto-create incident
}

export const DEFAULT_ALERTS_CONFIG: AlertsConfig = {
  emailEnabled: true,
  smsEnabled: false, // Disabled by default (costs money)
  webhooksEnabled: true,
  defaultCooldownMinutes: 15,
  maxAlertsPerHour: 100,
  autoCreateIncidents: true,
  incidentThreshold: 3, // 3 related alerts = auto-incident
};

// ============================================================================
// NOTIFICATION PROVIDER CONFIGURATION
// ============================================================================

export interface SendGridConfig {
  apiKey: string;
  fromEmail: string;
  fromName?: string;
}

export interface TwilioConfig {
  accountSid: string;
  authToken: string;
  fromPhoneNumber: string;
}

export interface WebhookConfig {
  url: string;
  headers?: Record<string, string>;
  retries?: number;
}

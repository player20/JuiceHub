/**
 * Notification Service
 *
 * Handles multi-channel notifications (email, SMS, webhooks)
 * Gracefully degrades if API keys are not configured
 *
 * Setup Required:
 * - SENDGRID_API_KEY for email notifications
 * - SENDGRID_FROM_EMAIL for sender address
 * - TWILIO_ACCOUNT_SID for SMS
 * - TWILIO_AUTH_TOKEN for SMS
 * - TWILIO_PHONE_NUMBER for SMS sender
 */

import { ILogger } from '@citrineos/base';
import { SequelizeRepository } from '@citrineos/data';
import sgMail from '@sendgrid/mail';
import twilio, { Twilio } from 'twilio';
import {
  AlertsConfig,
  DEFAULT_ALERTS_CONFIG,
  Notification,
  SendNotificationRequest,
} from './interfaces';

export class NotificationService {
  private readonly logger: ILogger;
  private readonly repository: SequelizeRepository;
  private readonly config: AlertsConfig;

  // Email provider
  private readonly emailEnabled: boolean;
  private readonly fromEmail: string;
  private readonly fromName: string;

  // SMS provider
  private readonly smsEnabled: boolean;
  private twilioClient: Twilio | null = null;
  private readonly twilioPhoneNumber: string;

  constructor(
    logger: ILogger,
    repository: SequelizeRepository,
    config: AlertsConfig = DEFAULT_ALERTS_CONFIG
  ) {
    this.logger = logger;
    this.repository = repository;
    this.config = config;

    // Initialize SendGrid for email
    const sendGridKey = process.env.SENDGRID_API_KEY;
    this.fromEmail = process.env.SENDGRID_FROM_EMAIL || 'noreply@example.com';
    this.fromName = process.env.SENDGRID_FROM_NAME || 'JuiceHub Alerts';

    if (sendGridKey && sendGridKey !== 'YOUR_SENDGRID_API_KEY_HERE') {
      try {
        sgMail.setApiKey(sendGridKey);
        this.emailEnabled = true;
        this.logger.info('SendGrid email notifications initialized successfully');
      } catch (error) {
        this.logger.error('Failed to initialize SendGrid', error);
        this.emailEnabled = false;
      }
    } else {
      this.emailEnabled = false;
      this.logger.warn(
        'SendGrid API key not configured - email notifications disabled. ' +
        'Set SENDGRID_API_KEY in environment to enable email.'
      );
    }

    // Initialize Twilio for SMS
    const twilioSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioToken = process.env.TWILIO_AUTH_TOKEN;
    this.twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER || '';

    if (
      twilioSid &&
      twilioToken &&
      twilioSid !== 'YOUR_TWILIO_ACCOUNT_SID_HERE' &&
      twilioToken !== 'YOUR_TWILIO_AUTH_TOKEN_HERE'
    ) {
      try {
        this.twilioClient = twilio(twilioSid, twilioToken);
        this.smsEnabled = config.smsEnabled;
        this.logger.info(
          `Twilio SMS notifications initialized${
            config.smsEnabled ? '' : ' but disabled in config'
          }`
        );
      } catch (error) {
        this.logger.error('Failed to initialize Twilio', error);
        this.smsEnabled = false;
      }
    } else {
      this.smsEnabled = false;
      this.logger.warn(
        'Twilio credentials not configured - SMS notifications disabled. ' +
        'Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER to enable SMS.'
      );
    }
  }

  /**
   * Check if email notifications are available
   */
  public isEmailEnabled(): boolean {
    return this.emailEnabled;
  }

  /**
   * Check if SMS notifications are available
   */
  public isSMSEnabled(): boolean {
    return this.smsEnabled;
  }

  /**
   * Send notification via specified channel
   *
   * @param request Notification details
   * @returns Notification record
   */
  async sendNotification(
    request: SendNotificationRequest
  ): Promise<Notification | null> {
    try {
      this.logger.info(
        `Sending ${request.channel} notification to ${request.recipient}`
      );

      let result: Notification | null = null;

      switch (request.channel) {
        case 'email':
          result = await this.sendEmail(request);
          break;
        case 'sms':
          result = await this.sendSMS(request);
          break;
        case 'webhook':
          result = await this.sendWebhook(request);
          break;
        case 'in_app':
          result = await this.sendInApp(request);
          break;
        default:
          this.logger.error(`Unknown notification channel: ${request.channel}`);
          return null;
      }

      return result;
    } catch (error) {
      this.logger.error('Failed to send notification', error);

      // Save failed notification to database
      return await this.saveNotification({
        ...request,
        status: 'failed',
        failureReason: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Send email notification
   */
  private async sendEmail(
    request: SendNotificationRequest
  ): Promise<Notification | null> {
    if (!this.emailEnabled) {
      this.logger.warn('Cannot send email - SendGrid not configured');
      return await this.saveNotification({
        ...request,
        status: 'failed',
        failureReason: 'Email provider not configured',
      });
    }

    try {
      const msg = {
        to: request.recipient,
        from: {
          email: this.fromEmail,
          name: this.fromName,
        },
        subject: request.subject || 'JuiceHub Alert',
        text: request.message,
        html: this.formatEmailHTML(request.message, request.subject),
      };

      const [response] = await sgMail.send(msg);

      this.logger.info(
        `Email sent successfully to ${request.recipient} (${response.statusCode})`
      );

      return await this.saveNotification({
        ...request,
        status: 'sent',
        sentAt: new Date(),
        externalId: response.headers['x-message-id'],
      });
    } catch (error: any) {
      this.logger.error('SendGrid email failed', error);

      return await this.saveNotification({
        ...request,
        status: 'failed',
        failureReason: error.message || 'Email send failed',
      });
    }
  }

  /**
   * Send SMS notification
   */
  private async sendSMS(
    request: SendNotificationRequest
  ): Promise<Notification | null> {
    if (!this.smsEnabled || !this.twilioClient) {
      this.logger.warn('Cannot send SMS - Twilio not configured or disabled');
      return await this.saveNotification({
        ...request,
        status: 'failed',
        failureReason: 'SMS provider not configured or disabled',
      });
    }

    try {
      const message = await this.twilioClient.messages.create({
        body: request.message,
        from: this.twilioPhoneNumber,
        to: request.recipient,
      });

      this.logger.info(
        `SMS sent successfully to ${request.recipient} (SID: ${message.sid})`
      );

      return await this.saveNotification({
        ...request,
        status: 'sent',
        sentAt: new Date(),
        externalId: message.sid,
      });
    } catch (error: any) {
      this.logger.error('Twilio SMS failed', error);

      return await this.saveNotification({
        ...request,
        status: 'failed',
        failureReason: error.message || 'SMS send failed',
      });
    }
  }

  /**
   * Send webhook notification
   */
  private async sendWebhook(
    request: SendNotificationRequest
  ): Promise<Notification | null> {
    try {
      // Webhook URL should be in recipient field
      const response = await fetch(request.recipient, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'JuiceHub-Alerts/1.0',
        },
        body: JSON.stringify({
          subject: request.subject,
          message: request.message,
          alertInstanceId: request.alertInstanceId,
          timestamp: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error(`Webhook responded with status ${response.status}`);
      }

      this.logger.info(`Webhook sent successfully to ${request.recipient}`);

      return await this.saveNotification({
        ...request,
        status: 'sent',
        sentAt: new Date(),
      });
    } catch (error: any) {
      this.logger.error('Webhook failed', error);

      return await this.saveNotification({
        ...request,
        status: 'failed',
        failureReason: error.message || 'Webhook send failed',
      });
    }
  }

  /**
   * Send in-app notification
   */
  private async sendInApp(
    request: SendNotificationRequest
  ): Promise<Notification | null> {
    try {
      // In-app notifications are just stored in database for UI to fetch
      this.logger.info(`In-app notification created for ${request.recipient}`);

      return await this.saveNotification({
        ...request,
        status: 'sent',
        sentAt: new Date(),
      });
    } catch (error: any) {
      this.logger.error('In-app notification failed', error);

      return await this.saveNotification({
        ...request,
        status: 'failed',
        failureReason: error.message || 'In-app notification failed',
      });
    }
  }

  /**
   * Get notifications for alert instance
   */
  async getNotifications(alertInstanceId: string): Promise<Notification[]> {
    try {
      const notifications = await this.repository.readOnlyDbConnection.models.alert_notifications.findAll({
        where: { alertInstanceId },
        order: [['createdAt', 'DESC']],
      });

      return notifications as Notification[];
    } catch (error) {
      this.logger.error(`Failed to get notifications for alert ${alertInstanceId}`, error);
      return [];
    }
  }

  /**
   * Retry failed notification
   */
  async retryNotification(notificationId: string): Promise<Notification | null> {
    try {
      const notification = await this.repository.readOnlyDbConnection.models.alert_notifications.findOne({
        where: { id: notificationId },
      });

      if (!notification) {
        throw new Error('Notification not found');
      }

      if (notification.status !== 'failed') {
        this.logger.warn(`Cannot retry notification ${notificationId} - status is ${notification.status}`);
        return notification as Notification;
      }

      // Retry sending
      return await this.sendNotification({
        channel: notification.channel,
        recipient: notification.recipient,
        subject: notification.subject,
        message: notification.message,
        alertInstanceId: notification.alertInstanceId,
        tenantId: notification.tenantId,
      });
    } catch (error) {
      this.logger.error(`Failed to retry notification ${notificationId}`, error);
      throw error;
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private async saveNotification(
    data: SendNotificationRequest & {
      status: Notification['status'];
      sentAt?: Date;
      deliveredAt?: Date;
      failureReason?: string;
      externalId?: string;
    }
  ): Promise<Notification> {
    const notification: Partial<Notification> = {
      tenantId: data.tenantId,
      alertInstanceId: data.alertInstanceId,
      channel: data.channel,
      recipient: data.recipient,
      subject: data.subject,
      message: data.message,
      status: data.status,
      sentAt: data.sentAt,
      deliveredAt: data.deliveredAt,
      failureReason: data.failureReason,
      externalId: data.externalId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const [result] = await this.repository.readOnlyDbConnection.models.alert_notifications.create(
      notification
    );

    return result as Notification;
  }

  private formatEmailHTML(message: string, subject?: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #1890ff; color: white; padding: 20px; text-align: center; }
            .content { background-color: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 4px; }
            .footer { text-align: center; color: #888; font-size: 12px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>${subject || 'JuiceHub Alert'}</h2>
            </div>
            <div class="content">
              ${message.replace(/\n/g, '<br>')}
            </div>
            <div class="footer">
              <p>This is an automated notification from JuiceHub</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }
}

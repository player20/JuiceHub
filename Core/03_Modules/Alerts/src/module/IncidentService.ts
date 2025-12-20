/**
 * Incident Service
 *
 * Handles incident management and tracking
 * No external API keys required
 */

import { ILogger } from '@citrineos/base';
import { SequelizeRepository } from '@citrineos/data';
import {
  Incident,
  IncidentNote,
  CreateIncidentRequest,
  AlertsConfig,
  DEFAULT_ALERTS_CONFIG,
} from './interfaces';

export class IncidentService {
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
   * Create new incident
   *
   * @param request Incident details
   * @returns Created incident
   */
  async createIncident(request: CreateIncidentRequest): Promise<Incident> {
    try {
      this.logger.info(`Creating incident: ${request.title}`);

      const incident: Partial<Incident> = {
        tenantId: request.tenantId,
        title: request.title,
        description: request.description,
        status: 'open',
        severity: request.severity,
        entityType: request.entityType,
        entityId: request.entityId,
        alertInstances: request.alertInstanceIds || [],
        startedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const [created] = await this.repository.readOnlyDbConnection.models.incidents.create(
        incident
      );

      this.logger.info(`Incident created: ${created.id} - ${request.title}`);

      return created as Incident;
    } catch (error) {
      this.logger.error('Failed to create incident', error);
      throw error;
    }
  }

  /**
   * Get incident by ID
   *
   * @param incidentId Incident ID
   * @returns Incident with notes
   */
  async getIncident(incidentId: string): Promise<Incident | null> {
    try {
      const incident = await this.repository.readOnlyDbConnection.models.incidents.findOne({
        where: { id: incidentId },
      });

      if (!incident) return null;

      // Get incident notes
      const notes = await this.repository.readOnlyDbConnection.models.incident_notes.findAll({
        where: { incidentId },
        order: [['createdAt', 'DESC']],
      });

      return {
        ...incident,
        notes,
      } as Incident;
    } catch (error) {
      this.logger.error(`Failed to get incident ${incidentId}`, error);
      return null;
    }
  }

  /**
   * Get all incidents
   *
   * @param tenantId Optional tenant filter
   * @param status Optional status filter
   * @returns List of incidents
   */
  async getIncidents(
    tenantId?: string,
    status?: Incident['status']
  ): Promise<Incident[]> {
    try {
      const where: any = {};
      if (tenantId) {
        where.tenantId = tenantId;
      }
      if (status) {
        where.status = status;
      }

      const incidents = await this.repository.readOnlyDbConnection.models.incidents.findAll({
        where,
        order: [['startedAt', 'DESC']],
      });

      return incidents as Incident[];
    } catch (error) {
      this.logger.error('Failed to get incidents', error);
      return [];
    }
  }

  /**
   * Update incident status
   *
   * @param incidentId Incident ID
   * @param status New status
   * @returns Updated incident
   */
  async updateStatus(
    incidentId: string,
    status: Incident['status']
  ): Promise<Incident | null> {
    try {
      const updates: any = {
        status,
        updatedAt: new Date(),
      };

      // Set resolvedAt when status becomes resolved
      if (status === 'resolved' || status === 'closed') {
        updates.resolvedAt = new Date();
      }

      await this.repository.readOnlyDbConnection.models.incidents.update(
        updates,
        { where: { id: incidentId } }
      );

      this.logger.info(`Incident ${incidentId} status updated to: ${status}`);

      return await this.getIncident(incidentId);
    } catch (error) {
      this.logger.error(`Failed to update incident status ${incidentId}`, error);
      throw error;
    }
  }

  /**
   * Assign incident to user
   *
   * @param incidentId Incident ID
   * @param userId User ID
   * @returns Updated incident
   */
  async assignIncident(
    incidentId: string,
    userId: string
  ): Promise<Incident | null> {
    try {
      await this.repository.readOnlyDbConnection.models.incidents.update(
        {
          assignedTo: userId,
          updatedAt: new Date(),
        },
        { where: { id: incidentId } }
      );

      this.logger.info(`Incident ${incidentId} assigned to user ${userId}`);

      return await this.getIncident(incidentId);
    } catch (error) {
      this.logger.error(`Failed to assign incident ${incidentId}`, error);
      throw error;
    }
  }

  /**
   * Add note to incident
   *
   * @param incidentId Incident ID
   * @param userId User adding the note
   * @param content Note content
   * @returns Created note
   */
  async addNote(
    incidentId: string,
    userId: string,
    content: string
  ): Promise<IncidentNote> {
    try {
      const note: Partial<IncidentNote> = {
        incidentId,
        userId,
        content,
        createdAt: new Date(),
      };

      const [created] = await this.repository.readOnlyDbConnection.models.incident_notes.create(
        note
      );

      this.logger.info(`Note added to incident ${incidentId} by user ${userId}`);

      return created as IncidentNote;
    } catch (error) {
      this.logger.error(`Failed to add note to incident ${incidentId}`, error);
      throw error;
    }
  }

  /**
   * Link alert to incident
   *
   * @param incidentId Incident ID
   * @param alertInstanceId Alert instance ID
   * @returns Updated incident
   */
  async linkAlert(
    incidentId: string,
    alertInstanceId: string
  ): Promise<Incident | null> {
    try {
      const incident = await this.getIncident(incidentId);

      if (!incident) {
        throw new Error('Incident not found');
      }

      const alertInstances = [...incident.alertInstances, alertInstanceId];

      await this.repository.readOnlyDbConnection.models.incidents.update(
        {
          alertInstances,
          updatedAt: new Date(),
        },
        { where: { id: incidentId } }
      );

      this.logger.info(`Alert ${alertInstanceId} linked to incident ${incidentId}`);

      return await this.getIncident(incidentId);
    } catch (error) {
      this.logger.error(
        `Failed to link alert ${alertInstanceId} to incident ${incidentId}`,
        error
      );
      throw error;
    }
  }

  /**
   * Get incident statistics
   *
   * @param tenantId Optional tenant filter
   * @returns Incident stats
   */
  async getStatistics(tenantId?: string): Promise<{
    total: number;
    open: number;
    investigating: number;
    resolved: number;
    criticalOpen: number;
    avgResolutionTimeHours: number;
  }> {
    try {
      const tenantFilter = tenantId ? 'WHERE tenant_id = :tenantId' : '';

      const query = `
        SELECT
          COUNT(*) as total,
          COUNT(CASE WHEN status = 'open' THEN 1 END) as open,
          COUNT(CASE WHEN status = 'investigating' THEN 1 END) as investigating,
          COUNT(CASE WHEN status = 'resolved' OR status = 'closed' THEN 1 END) as resolved,
          COUNT(CASE WHEN status = 'open' AND severity = 'critical' THEN 1 END) as critical_open,
          AVG(
            CASE WHEN resolved_at IS NOT NULL
            THEN EXTRACT(EPOCH FROM (resolved_at - started_at)) / 3600
            END
          ) as avg_resolution_hours
        FROM incidents
        ${tenantFilter}
      `;

      const [stats] = await this.repository.readOnlyDbConnection.query(query, {
        replacements: { tenantId },
        type: 'SELECT',
      });

      return {
        total: Number(stats.total) || 0,
        open: Number(stats.open) || 0,
        investigating: Number(stats.investigating) || 0,
        resolved: Number(stats.resolved) || 0,
        criticalOpen: Number(stats.critical_open) || 0,
        avgResolutionTimeHours: Number(stats.avg_resolution_hours) || 0,
      };
    } catch (error) {
      this.logger.error('Failed to get incident statistics', error);
      return {
        total: 0,
        open: 0,
        investigating: 0,
        resolved: 0,
        criticalOpen: 0,
        avgResolutionTimeHours: 0,
      };
    }
  }

  /**
   * Auto-create incident from related alerts
   *
   * Checks if multiple alerts for the same entity should become an incident
   *
   * @param entityId Entity ID (station, connector, etc.)
   * @param entityType Entity type
   */
  async checkAutoCreateIncident(
    entityId: string,
    entityType: Incident['entityType']
  ): Promise<Incident | null> {
    try {
      if (!this.config.autoCreateIncidents) {
        return null;
      }

      // Get recent active alerts for this entity
      const recentAlerts = await this.repository.readOnlyDbConnection.models.alert_instances.findAll({
        where: {
          entityId,
          entityType,
          status: 'active',
          triggeredAt: {
            $gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
          },
        },
      });

      if (recentAlerts.length >= this.config.incidentThreshold) {
        this.logger.info(
          `Auto-creating incident: ${recentAlerts.length} alerts for ${entityType} ${entityId}`
        );

        const incident = await this.createIncident({
          title: `Multiple alerts for ${entityType} ${entityId}`,
          description: `Auto-created incident due to ${recentAlerts.length} alerts in the last 24 hours`,
          severity: 'high',
          entityType,
          entityId,
          alertInstanceIds: recentAlerts.map((a) => a.id),
        });

        return incident;
      }

      return null;
    } catch (error) {
      this.logger.error('Failed to check auto-create incident', error);
      return null;
    }
  }
}

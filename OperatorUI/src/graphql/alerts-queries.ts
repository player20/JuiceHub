// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import { gql } from 'graphql-tag';

/**
 * Alerts Module GraphQL Queries
 *
 * NOTE: These queries require Hasura to be configured with the alerts schema.
 * Ensure the following tables are exposed via Hasura:
 * - alert_rules
 * - alerts
 * - incidents
 * - notifications
 */

// Get alert rules
export const GET_ALERT_RULES = gql`
  query GetAlertRules($where: alert_rules_bool_exp, $orderBy: [alert_rules_order_by!]) {
    alert_rules(where: $where, order_by: $orderBy) {
      id
      name
      description
      rule_type
      severity
      metric_name
      threshold_value
      comparison_operator
      time_window_minutes
      cooldown_minutes
      is_enabled
      notify_email
      notify_sms
      notify_webhook
      create_incident
      incident_severity
      created_at
      updated_at
    }
    alert_rules_aggregate(where: $where) {
      aggregate {
        count
      }
    }
  }
`;

// Get active alerts
export const GET_ACTIVE_ALERTS = gql`
  query GetActiveAlerts($limit: Int!, $offset: Int!, $where: alerts_bool_exp) {
    alerts(
      limit: $limit
      offset: $offset
      where: $where
      order_by: { triggered_at: desc }
    ) {
      id
      rule_id
      severity
      title
      message
      metric_name
      metric_value
      threshold_value
      triggered_at
      acknowledged_at
      resolved_at
      status
      charging_station_id
      ChargingStation {
        id
        station_id
        registration_status
      }
      AlertRule {
        id
        name
        rule_type
      }
      Incident {
        id
        incident_number
        status
      }
    }
    alerts_aggregate(where: $where) {
      aggregate {
        count
      }
    }
  }
`;

// Get alert detail
export const GET_ALERT_DETAIL = gql`
  query GetAlertDetail($id: uuid!) {
    alerts_by_pk(id: $id) {
      id
      rule_id
      severity
      title
      message
      metric_name
      metric_value
      threshold_value
      triggered_at
      acknowledged_at
      acknowledged_by
      resolved_at
      resolved_by
      status
      charging_station_id
      metadata
      ChargingStation {
        id
        station_id
        registration_status
        Location {
          name
          address
        }
      }
      AlertRule {
        id
        name
        description
        rule_type
        severity
      }
      Incident {
        id
        incident_number
        title
        status
        severity
      }
      Notifications {
        id
        channel
        status
        sent_at
        recipient
      }
    }
  }
`;

// Get incidents
export const GET_INCIDENTS = gql`
  query GetIncidents($limit: Int!, $offset: Int!, $where: incidents_bool_exp, $orderBy: [incidents_order_by!]) {
    incidents(
      limit: $limit
      offset: $offset
      where: $where
      order_by: $orderBy
    ) {
      id
      incident_number
      title
      description
      severity
      status
      charging_station_id
      created_at
      acknowledged_at
      resolved_at
      ChargingStation {
        id
        station_id
        registration_status
      }
      Alerts_aggregate {
        aggregate {
          count
        }
      }
    }
    incidents_aggregate(where: $where) {
      aggregate {
        count
      }
    }
  }
`;

// Get incident detail
export const GET_INCIDENT_DETAIL = gql`
  query GetIncidentDetail($id: uuid!) {
    incidents_by_pk(id: $id) {
      id
      incident_number
      title
      description
      severity
      status
      charging_station_id
      created_at
      created_by
      acknowledged_at
      acknowledged_by
      resolved_at
      resolved_by
      resolution_notes
      metadata
      ChargingStation {
        id
        station_id
        registration_status
        Location {
          name
          address
        }
      }
      Alerts {
        id
        severity
        title
        message
        triggered_at
        resolved_at
        status
      }
      Notes {
        id
        note
        created_at
        created_by
      }
    }
  }
`;

// Get alert statistics
export const GET_ALERT_STATS = gql`
  query GetAlertStats($startDate: timestamptz!, $endDate: timestamptz!) {
    alerts_aggregate(
      where: {
        triggered_at: { _gte: $startDate, _lte: $endDate }
      }
    ) {
      aggregate {
        count
      }
    }
    critical_alerts: alerts_aggregate(
      where: {
        triggered_at: { _gte: $startDate, _lte: $endDate }
        severity: { _eq: "critical" }
      }
    ) {
      aggregate {
        count
      }
    }
    active_alerts: alerts_aggregate(
      where: {
        status: { _eq: "active" }
      }
    ) {
      aggregate {
        count
      }
    }
    incidents_aggregate(
      where: {
        created_at: { _gte: $startDate, _lte: $endDate }
      }
    ) {
      aggregate {
        count
      }
    }
    open_incidents: incidents_aggregate(
      where: {
        status: { _in: ["open", "investigating"] }
      }
    ) {
      aggregate {
        count
      }
    }
  }
`;

// Get notifications history
export const GET_NOTIFICATIONS = gql`
  query GetNotifications($limit: Int!, $offset: Int!, $where: notifications_bool_exp) {
    notifications(
      limit: $limit
      offset: $offset
      where: $where
      order_by: { created_at: desc }
    ) {
      id
      alert_id
      channel
      recipient
      subject
      message
      status
      sent_at
      failure_reason
      created_at
      Alert {
        id
        title
        severity
      }
    }
    notifications_aggregate(where: $where) {
      aggregate {
        count
      }
    }
  }
`;

// Create alert rule mutation
export const CREATE_ALERT_RULE = gql`
  mutation CreateAlertRule($input: alert_rules_insert_input!) {
    insert_alert_rules_one(object: $input) {
      id
      name
    }
  }
`;

// Update alert rule mutation
export const UPDATE_ALERT_RULE = gql`
  mutation UpdateAlertRule($id: uuid!, $input: alert_rules_set_input!) {
    update_alert_rules_by_pk(pk_columns: { id: $id }, _set: $input) {
      id
    }
  }
`;

// Delete alert rule mutation
export const DELETE_ALERT_RULE = gql`
  mutation DeleteAlertRule($id: uuid!) {
    delete_alert_rules_by_pk(id: $id) {
      id
    }
  }
`;

// Acknowledge alert mutation
export const ACKNOWLEDGE_ALERT = gql`
  mutation AcknowledgeAlert($id: uuid!, $acknowledgedBy: String!) {
    update_alerts_by_pk(
      pk_columns: { id: $id }
      _set: {
        status: "acknowledged"
        acknowledged_at: "now()"
        acknowledged_by: $acknowledgedBy
      }
    ) {
      id
      status
    }
  }
`;

// Resolve alert mutation
export const RESOLVE_ALERT = gql`
  mutation ResolveAlert($id: uuid!, $resolvedBy: String!) {
    update_alerts_by_pk(
      pk_columns: { id: $id }
      _set: {
        status: "resolved"
        resolved_at: "now()"
        resolved_by: $resolvedBy
      }
    ) {
      id
      status
    }
  }
`;

// Update incident mutation
export const UPDATE_INCIDENT = gql`
  mutation UpdateIncident($id: uuid!, $input: incidents_set_input!) {
    update_incidents_by_pk(pk_columns: { id: $id }, _set: $input) {
      id
      status
    }
  }
`;

// Create incident note mutation
export const CREATE_INCIDENT_NOTE = gql`
  mutation CreateIncidentNote($incidentId: uuid!, $note: String!, $createdBy: String!) {
    insert_incident_notes_one(
      object: {
        incident_id: $incidentId
        note: $note
        created_by: $createdBy
      }
    ) {
      id
    }
  }
`;

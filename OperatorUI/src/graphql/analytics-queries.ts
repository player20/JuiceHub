// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import gql from 'graphql-tag';

/**
 * GraphQL queries for Analytics Module
 *
 * NOTE: These queries assume Hasura has been configured to expose
 * the analytics tables (usage_snapshots, station_performance_daily)
 * via GraphQL API. If not yet configured, these queries will fail.
 *
 * To expose tables in Hasura:
 * 1. Navigate to Hasura Console (http://localhost:8080)
 * 2. Go to Data tab
 * 3. Track the new tables: usage_snapshots, station_performance_daily
 * 4. Set appropriate permissions for your role
 */

/**
 * Get usage snapshots for a date range
 */
export const GET_USAGE_SNAPSHOTS = gql`
  query GetUsageSnapshots($startDate: date!, $endDate: date!) {
    usage_snapshots(
      where: {
        snapshot_date: { _gte: $startDate, _lte: $endDate }
      }
      order_by: { snapshot_date: asc }
    ) {
      id
      snapshot_date
      total_sessions
      total_energy_kwh
      total_revenue
      unique_users
      total_duration_minutes
    }
  }
`;

/**
 * Get usage snapshots aggregate (totals)
 */
export const GET_USAGE_AGGREGATE = gql`
  query GetUsageAggregate($startDate: date!, $endDate: date!) {
    usage_snapshots_aggregate(
      where: {
        snapshot_date: { _gte: $startDate, _lte: $endDate }
      }
    ) {
      aggregate {
        sum {
          total_sessions
          total_energy_kwh
          total_revenue
          total_duration_minutes
        }
      }
    }
  }
`;

/**
 * Get station performance daily data
 */
export const GET_STATION_PERFORMANCE = gql`
  query GetStationPerformance($startDate: date!, $endDate: date!) {
    station_performance_daily(
      where: {
        date: { _gte: $startDate, _lte: $endDate }
      }
      order_by: { date: asc }
    ) {
      id
      charging_station_id
      date
      uptime_percentage
      health_score
      total_sessions
      successful_sessions
      failed_sessions
      total_energy_kwh
      total_revenue
      avg_session_duration_minutes
    }
  }
`;

/**
 * Get low-performing stations (health score below threshold)
 */
export const GET_LOW_PERFORMING_STATIONS = gql`
  query GetLowPerformingStations($threshold: Int!, $date: date!) {
    station_performance_daily(
      where: {
        date: { _eq: $date }
        health_score: { _lt: $threshold }
      }
      order_by: { health_score: asc }
    ) {
      id
      charging_station_id
      health_score
      uptime_percentage
      total_sessions
      failed_sessions
      ChargingStation {
        id
        station_id
        registration_status
      }
    }
  }
`;

/**
 * Get quick stats for today
 */
export const GET_TODAY_STATS = gql`
  query GetTodayStats($today: date!) {
    today: usage_snapshots(
      where: { snapshot_date: { _eq: $today } }
    ) {
      total_sessions
      total_energy_kwh
      total_revenue
      unique_users
    }

    yesterday: usage_snapshots(
      where: { snapshot_date: { _eq: $today } }
    ) {
      total_sessions
      total_energy_kwh
      total_revenue
    }
  }
`;

/**
 * Get network summary stats
 */
export const GET_NETWORK_SUMMARY = gql`
  query GetNetworkSummary {
    total_stations: ChargingStations_aggregate {
      aggregate {
        count
      }
    }

    active_stations: ChargingStations_aggregate(
      where: { registration_status: { _eq: "Accepted" } }
    ) {
      aggregate {
        count
      }
    }

    total_connectors: Connectors_aggregate {
      aggregate {
        count
      }
    }

    all_time_sessions: Transactions_aggregate {
      aggregate {
        count
        sum {
          total_cost
        }
      }
    }
  }
`;

/**
 * Get top stations by revenue
 */
export const GET_TOP_STATIONS = gql`
  query GetTopStations($startDate: timestamptz!, $endDate: timestamptz!, $limit: Int!) {
    Transactions(
      where: {
        time_start: { _gte: $startDate, _lte: $endDate }
      }
    ) {
      charging_station_id
      total_cost
      ChargingStation {
        id
        station_id
      }
    }
  }
`;

/**
 * Get sparkline data (last 24 hours, hourly)
 * NOTE: This requires a custom Hasura function or aggregation
 * For now, we'll query recent transactions
 */
export const GET_SPARKLINE_DATA = gql`
  query GetSparklineData($startTime: timestamptz!) {
    Transactions(
      where: {
        time_start: { _gte: $startTime }
      }
      order_by: { time_start: asc }
    ) {
      id
      time_start
      total_cost
      meter_stop
      meter_start
    }
  }
`;

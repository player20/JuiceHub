// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import { gql } from 'graphql-tag';

export const ERROR_LOG_LIST_QUERY = gql`
  query ErrorLogsList(
    $offset: Int!
    $limit: Int!
    $order_by: [OcppErrorLog_order_by!]
    $where: OcppErrorLog_bool_exp
  ) {
    OcppErrorLog(
      offset: $offset
      limit: $limit
      order_by: $order_by
      where: $where
    ) {
      id
      stationId
      connectorId
      transactionId
      errorCode
      severity
      errorDescription
      vendorErrorCode
      vendorErrorDescription
      messageType
      errorCategory
      occuredAt
      resolved
      resolvedAt
      resolutionNotes
      resolvedBy
      rawPayload
      createdAt
      updatedAt
    }
    OcppErrorLog_aggregate(where: $where) {
      aggregate {
        count
      }
    }
  }
`;

export const ERROR_LOG_LIST_FOR_STATION_QUERY = gql`
  query ErrorLogsForStationList(
    $stationId: String!
    $order_by: [OcppErrorLog_order_by!] = {}
    $where: [OcppErrorLog_bool_exp!] = []
    $offset: Int!
    $limit: Int!
  ) {
    OcppErrorLog(
      where: { stationId: { _eq: $stationId }, _and: $where }
      offset: $offset
      limit: $limit
      order_by: $order_by
    ) {
      id
      stationId
      connectorId
      transactionId
      errorCode
      severity
      errorDescription
      vendorErrorCode
      vendorErrorDescription
      messageType
      errorCategory
      occuredAt
      resolved
      resolvedAt
      resolutionNotes
      resolvedBy
      rawPayload
      createdAt
      updatedAt
    }
    OcppErrorLog_aggregate(
      where: { stationId: { _eq: $stationId }, _and: $where }
    ) {
      aggregate {
        count
      }
    }
  }
`;

export const ERROR_LOG_GET_QUERY = gql`
  query GetErrorLogById($id: Int!) {
    OcppErrorLog_by_pk(id: $id) {
      id
      stationId
      connectorId
      transactionId
      errorCode
      severity
      errorDescription
      vendorErrorCode
      vendorErrorDescription
      messageType
      errorCategory
      occuredAt
      resolved
      resolvedAt
      resolutionNotes
      resolvedBy
      rawPayload
      createdAt
      updatedAt
    }
  }
`;

export const ERROR_LOG_DELETE_MUTATION = gql`
  mutation ErrorLogDelete($id: Int!) {
    delete_OcppErrorLog_by_pk(id: $id) {
      id
      stationId
      connectorId
      transactionId
      errorCode
      severity
      errorDescription
      vendorErrorCode
      vendorErrorDescription
      messageType
      errorCategory
      occuredAt
      resolved
      resolvedAt
      resolutionNotes
      resolvedBy
      rawPayload
      createdAt
      updatedAt
    }
  }
`;

export const ERROR_LOG_UPDATE_MUTATION = gql`
  mutation ErrorLogUpdate(
    $id: Int!
    $object: OcppErrorLog_set_input!
  ) {
    update_OcppErrorLog_by_pk(pk_columns: { id: $id }, _set: $object) {
      id
      stationId
      connectorId
      transactionId
      errorCode
      severity
      errorDescription
      vendorErrorCode
      vendorErrorDescription
      messageType
      errorCategory
      occuredAt
      resolved
      resolvedAt
      resolutionNotes
      resolvedBy
      rawPayload
      createdAt
      updatedAt
    }
  }
`;

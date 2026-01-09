// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import { gql } from 'graphql-tag';

export const GET_SYSTEM_SETTINGS = gql`
  query GetSystemSettings {
    SystemSettings(limit: 1) {
      id
      google_maps_api_key
      google_maps_enabled
      organization_name
      support_email
      support_phone
      createdAt
      updatedAt
    }
  }
`;

export const UPDATE_SYSTEM_SETTINGS = gql`
  mutation UpdateSystemSettings(
    $id: Int!
    $google_maps_api_key: String
    $google_maps_enabled: Boolean
    $organization_name: String
    $support_email: String
    $support_phone: String
  ) {
    update_SystemSettings_by_pk(
      pk_columns: { id: $id }
      _set: {
        google_maps_api_key: $google_maps_api_key
        google_maps_enabled: $google_maps_enabled
        organization_name: $organization_name
        support_email: $support_email
        support_phone: $support_phone
      }
    ) {
      id
      google_maps_api_key
      google_maps_enabled
      organization_name
      support_email
      support_phone
      updatedAt
    }
  }
`;

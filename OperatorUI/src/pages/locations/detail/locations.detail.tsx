// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { Card } from 'antd';
import './style.scss';
import { useParams } from 'react-router-dom';
import { CanAccess, useOne } from '@refinedev/core';
import { getPlainToInstanceOptions } from '@util/tables';
import { LocationDto } from '../../../dtos/location.dto';
import { LOCATIONS_GET_QUERY } from '../queries';
import { LocationsChargingStationsTable } from '../list/locations.charging.stations.table';
import { LocationDetailCard } from './location.detail.card';
import { ActionType, ResourceType } from '@util/auth';
import { ILocationDto } from '@citrineos/base';

export const LocationsDetail = () => {
  const { id } = useParams<{ id: string }>();

  // Validate ID before querying
  const isValidId = id && id !== 'undefined' && !isNaN(Number(id));

  const { data, isLoading } = useOne<ILocationDto>({
    resource: ResourceType.LOCATIONS,
    id: isValidId ? id : undefined,
    meta: {
      gqlQuery: LOCATIONS_GET_QUERY,
    },
    queryOptions: {
      ...getPlainToInstanceOptions(LocationDto, true),
      enabled: isValidId,
    },
  });

  const location = data?.data;

  if (!isValidId) return <p>Invalid location ID</p>;
  if (isLoading) return <p>Loading...</p>;
  if (!location) return <p>No Data Found</p>;

  return (
    <CanAccess
      resource={ResourceType.LOCATIONS}
      action={ActionType.SHOW}
      params={{ id: location.id }}
    >
      <div>
        <Card className="location-details">
          <LocationDetailCard location={location} />
        </Card>

        <Card>
          <LocationsChargingStationsTable location={location} showHeader />
        </Card>
      </div>
    </CanAccess>
  );
};

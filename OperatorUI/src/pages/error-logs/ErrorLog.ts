// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import { IsInt, IsNotEmpty, IsString, IsBoolean } from 'class-validator';
import { TransformDate } from '@util/TransformDate';
import { ClassResourceType } from '@util/decorators/ClassResourceType';
import { ResourceType } from '@util/auth';
import { ClassGqlListQuery } from '@util/decorators/ClassGqlListQuery';
import { ClassGqlGetQuery } from '@util/decorators/ClassGqlGetQuery';
import { ClassGqlDeleteMutation } from '@util/decorators/ClassGqlDeleteMutation';
import { PrimaryKeyFieldName } from '@util/decorators/PrimaryKeyFieldName';
import {
  ERROR_LOG_DELETE_MUTATION,
  ERROR_LOG_GET_QUERY,
  ERROR_LOG_LIST_QUERY,
} from './queries';

export interface IErrorLogDto {
  id: number;
  stationId: string;
  errorCode: string;
  severity: string;
  errorDescription?: string;
  vendorId?: string;
  vendorErrorCode?: string;
  occuredAt: string;
  resolved: boolean;
  resolvedAt?: string;
  resolutionNotes?: string;
  affectedComponent?: string;
  createdAt: string;
  updatedAt: string;
}

export enum ErrorLogDtoProps {
  id = 'id',
  stationId = 'stationId',
  errorCode = 'errorCode',
  severity = 'severity',
  errorDescription = 'errorDescription',
  vendorId = 'vendorId',
  vendorErrorCode = 'vendorErrorCode',
  occuredAt = 'occuredAt',
  resolved = 'resolved',
  resolvedAt = 'resolvedAt',
  resolutionNotes = 'resolutionNotes',
  affectedComponent = 'affectedComponent',
  createdAt = 'createdAt',
  updatedAt = 'updatedAt',
}

@ClassResourceType(ResourceType.ERROR_LOGS)
@ClassGqlListQuery(ERROR_LOG_LIST_QUERY)
@ClassGqlGetQuery(ERROR_LOG_GET_QUERY)
@ClassGqlDeleteMutation(ERROR_LOG_DELETE_MUTATION)
@PrimaryKeyFieldName(ErrorLogDtoProps.id)
export class ErrorLog implements Partial<IErrorLogDto> {
  @IsInt()
  @IsNotEmpty()
  id!: number;

  @IsString()
  @IsNotEmpty()
  stationId!: string;

  @IsString()
  @IsNotEmpty()
  errorCode!: string;

  @IsString()
  @IsNotEmpty()
  severity!: string;

  @IsString()
  errorDescription?: string;

  @IsString()
  vendorId?: string;

  @IsString()
  vendorErrorCode?: string;

  @TransformDate()
  @IsNotEmpty()
  occuredAt!: string;

  @IsBoolean()
  resolved!: boolean;

  @TransformDate()
  resolvedAt?: string;

  @IsString()
  resolutionNotes?: string;

  @IsString()
  affectedComponent?: string;

  @TransformDate()
  createdAt!: string;

  @TransformDate()
  updatedAt!: string;

  constructor(data: Partial<IErrorLogDto>) {
    if (data) {
      Object.assign(this, {
        [ErrorLogDtoProps.id]: data.id,
        [ErrorLogDtoProps.stationId]: data.stationId,
        [ErrorLogDtoProps.errorCode]: data.errorCode,
        [ErrorLogDtoProps.severity]: data.severity,
        [ErrorLogDtoProps.errorDescription]: data.errorDescription,
        [ErrorLogDtoProps.vendorId]: data.vendorId,
        [ErrorLogDtoProps.vendorErrorCode]: data.vendorErrorCode,
        [ErrorLogDtoProps.occuredAt]: data.occuredAt,
        [ErrorLogDtoProps.resolved]: data.resolved,
        [ErrorLogDtoProps.resolvedAt]: data.resolvedAt,
        [ErrorLogDtoProps.resolutionNotes]: data.resolutionNotes,
        [ErrorLogDtoProps.affectedComponent]: data.affectedComponent,
        [ErrorLogDtoProps.createdAt]: data.createdAt,
        [ErrorLogDtoProps.updatedAt]: data.updatedAt,
      });
    }
  }
}

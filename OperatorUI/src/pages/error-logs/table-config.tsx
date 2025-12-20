// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import { TableColumnsType, Tag } from 'antd';
import { ActionsColumn } from '../../components/data-model-table/actions-column';
import { ERROR_LOG_DELETE_MUTATION } from './queries';
import { ResourceType } from '@util/auth';
import { ColumnAction } from '@enums';
import { IErrorLogDto } from './ErrorLog';
import React from 'react';

export const ERROR_LOG_COLUMNS = (
  withActions: boolean,
  parentView?: ResourceType,
): TableColumnsType<IErrorLogDto> => {
  const baseColumns: TableColumnsType<IErrorLogDto> = [
    {
      dataIndex: 'id',
      title: 'ID',
      sorter: true,
      width: 80,
    },
    {
      dataIndex: 'stationId',
      title: 'Charger ID',
      sorter: true,
      width: 150,
      render: (stationId: string) => (
        <strong style={{ color: '#1890ff' }}>{stationId}</strong>
      ),
    },
    {
      dataIndex: 'errorCode',
      title: 'Error Code',
      sorter: true,
      width: 150,
      render: (errorCode: string) => (
        <code style={{
          backgroundColor: '#f0f0f0',
          padding: '2px 6px',
          borderRadius: '3px',
          fontFamily: 'monospace'
        }}>
          {errorCode}
        </code>
      ),
    },
    {
      dataIndex: 'severity',
      title: 'Severity',
      sorter: true,
      width: 120,
      render: (severity: string) => {
        let color = 'default';
        switch (severity?.toUpperCase()) {
          case 'CRITICAL':
            color = 'red';
            break;
          case 'ERROR':
            color = 'orange';
            break;
          case 'WARNING':
            color = 'gold';
            break;
          case 'INFO':
            color = 'blue';
            break;
          default:
            color = 'default';
        }
        return <Tag color={color}>{severity?.toUpperCase()}</Tag>;
      },
    },
    {
      dataIndex: 'errorDescription',
      title: 'Description',
      width: 250,
      ellipsis: true,
    },
    {
      dataIndex: 'affectedComponent',
      title: 'Component',
      width: 120,
      ellipsis: true,
    },
    {
      dataIndex: 'occuredAt',
      title: 'Occurred At',
      sorter: true,
      width: 180,
      render: (date: string) => {
        if (!date) return '';
        return new Date(date).toLocaleString();
      },
    },
    {
      dataIndex: 'resolved',
      title: 'Status',
      sorter: true,
      width: 120,
      render: (resolved: boolean, record: IErrorLogDto) => {
        if (resolved) {
          return (
            <Tag color="green" icon={<span>✓</span>}>
              Resolved
            </Tag>
          );
        }
        return (
          <Tag color="red" icon={<span>⏳</span>}>
            Pending
          </Tag>
        );
      },
    },
    {
      dataIndex: 'resolvedAt',
      title: 'Resolved At',
      width: 180,
      render: (date: string) => {
        if (!date) return '—';
        return new Date(date).toLocaleString();
      },
    },
    {
      dataIndex: 'vendorErrorCode',
      title: 'Vendor Code',
      width: 120,
      ellipsis: true,
    },
  ];

  if (withActions) {
    baseColumns.unshift({
      dataIndex: 'actions',
      title: 'Actions',
      className: 'actions-column',
      width: 100,
      fixed: 'left',
      render: (_: any, record: IErrorLogDto) => (
        <ActionsColumn
          record={record}
          gqlDeleteMutation={ERROR_LOG_DELETE_MUTATION}
          actions={[
            { type: ColumnAction.SHOW },
            { type: ColumnAction.DELETE },
          ]}
        />
      ),
    });
  }

  return baseColumns;
};

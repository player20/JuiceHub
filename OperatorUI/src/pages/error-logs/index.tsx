// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import { ResourceType } from '@util/auth';
import { Route, Routes } from 'react-router-dom';
import React, { useState } from 'react';
import { GenericView } from '../../components/view';
import { useTable } from '@refinedev/antd';
import { ErrorLog, IErrorLogDto } from './ErrorLog';
import { DataModelTable } from '../../components';
import { IDataModelListProps } from '../../model/interfaces';
import { DEFAULT_SORTERS } from '../../components/defaults';
import {
  ERROR_LOG_DELETE_MUTATION,
  ERROR_LOG_GET_QUERY,
  ERROR_LOG_LIST_QUERY,
} from './queries';
import { ERROR_LOG_COLUMNS } from './table-config';
import { MdOutlineErrorOutline } from 'react-icons/md';
import {
  Card,
  Input,
  Select,
  DatePicker,
  Space,
  Button,
  Row,
  Col,
  Statistic,
} from 'antd';
import {
  SearchOutlined,
  ReloadOutlined,
  DownloadOutlined,
  FilterOutlined,
} from '@ant-design/icons';

const { RangePicker } = DatePicker;

export const ErrorLogView: React.FC = () => {
  return (
    <GenericView
      dtoClass={ErrorLog}
      gqlQuery={ERROR_LOG_GET_QUERY}
      editMutation={undefined}
      createMutation={undefined}
      deleteMutation={ERROR_LOG_DELETE_MUTATION}
    />
  );
};

interface ErrorLogListQuery {
  OcppErrorLog: IErrorLogDto[];
  OcppErrorLog_aggregate: {
    aggregate: {
      count: number;
    };
  };
}

export const ErrorLogsList = (props: IDataModelListProps) => {
  const [searchStationId, setSearchStationId] = useState<string>('');
  const [severityFilter, setSeverityFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<boolean | null>(null);
  const [dateRange, setDateRange] = useState<[any, any] | null>(null);

  // Build dynamic filters
  const buildFilters = () => {
    const filters: any = { _and: [] };

    if (searchStationId) {
      filters._and.push({
        stationId: { _ilike: `%${searchStationId}%` },
      });
    }

    if (severityFilter) {
      filters._and.push({
        severity: { _eq: severityFilter },
      });
    }

    if (statusFilter !== null) {
      filters._and.push({
        resolved: { _eq: statusFilter },
      });
    }

    if (dateRange && dateRange[0] && dateRange[1]) {
      filters._and.push({
        occuredAt: {
          _gte: dateRange[0].toISOString(),
          _lte: dateRange[1].toISOString(),
        },
      });
    }

    return filters._and.length > 0 ? filters : undefined;
  };

  const { tableProps, tableQueryResult } = useTable<ErrorLogListQuery>({
    resource: 'OcppErrorLog',
    sorters: {
      initial: [{ field: 'occuredAt', order: 'desc' }],
    },
    filters: {
      permanent: buildFilters(),
    },
    metaData: {
      gqlQuery: ERROR_LOG_LIST_QUERY,
    },
  });

  const handleReset = () => {
    setSearchStationId('');
    setSeverityFilter(null);
    setStatusFilter(null);
    setDateRange(null);
  };

  const handleExport = () => {
    const data = (tableQueryResult?.data?.data as any)?.OcppErrorLog || [];
    const csv = [
      [
        'ID',
        'Charger ID',
        'Error Code',
        'Severity',
        'Description',
        'Component',
        'Occurred At',
        'Status',
        'Resolved At',
        'Vendor Code',
      ].join(','),
      ...data.map((row: IErrorLogDto) =>
        [
          row.id,
          row.stationId,
          row.errorCode,
          row.severity,
          `"${row.errorDescription || ''}"`,
          row.affectedComponent || '',
          row.occuredAt,
          row.resolved ? 'Resolved' : 'Pending',
          row.resolvedAt || '',
          row.vendorErrorCode || '',
        ].join(','),
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `error-logs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const totalErrors =
    (tableQueryResult?.data?.data as any)?.OcppErrorLog_aggregate?.aggregate?.count || 0;
  const unresolvedErrors =
    (tableQueryResult?.data?.data as any)?.OcppErrorLog?.filter((e: IErrorLogDto) => !e.resolved)
      .length || 0;

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      {/* Summary Statistics */}
      <Row gutter={16}>
        <Col span={8}>
          <Card>
            <Statistic
              title="Total Errors"
              value={totalErrors}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="Unresolved"
              value={unresolvedErrors}
              valueStyle={{ color: unresolvedErrors > 0 ? '#ff4d4f' : '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="Resolved"
              value={totalErrors - unresolvedErrors}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Search and Filter Controls */}
      <Card
        title={
          <Space>
            <FilterOutlined />
            Search & Filters
          </Space>
        }
      >
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Row gutter={16}>
            <Col span={8}>
              <Input
                placeholder="Search by Charger ID"
                prefix={<SearchOutlined />}
                value={searchStationId}
                onChange={(e) => setSearchStationId(e.target.value)}
                allowClear
              />
            </Col>
            <Col span={6}>
              <Select
                placeholder="Filter by Severity"
                value={severityFilter}
                onChange={setSeverityFilter}
                style={{ width: '100%' }}
                allowClear
              >
                <Select.Option value="CRITICAL">Critical</Select.Option>
                <Select.Option value="ERROR">Error</Select.Option>
                <Select.Option value="WARNING">Warning</Select.Option>
                <Select.Option value="INFO">Info</Select.Option>
              </Select>
            </Col>
            <Col span={6}>
              <Select
                placeholder="Filter by Status"
                value={statusFilter}
                onChange={setStatusFilter}
                style={{ width: '100%' }}
                allowClear
              >
                <Select.Option value={false}>Pending</Select.Option>
                <Select.Option value={true}>Resolved</Select.Option>
              </Select>
            </Col>
            <Col span={4}>
              <Space>
                <Button
                  onClick={handleReset}
                  icon={<ReloadOutlined />}
                >
                  Reset
                </Button>
                <Button
                  onClick={handleExport}
                  icon={<DownloadOutlined />}
                  type="primary"
                >
                  Export CSV
                </Button>
              </Space>
            </Col>
          </Row>
          <Row>
            <Col span={12}>
              <RangePicker
                showTime
                value={dateRange}
                onChange={(dates) => setDateRange(dates as [any, any])}
                style={{ width: '100%' }}
                placeholder={['Start Date', 'End Date']}
              />
            </Col>
          </Row>
        </Space>
      </Card>

      {/* Error Logs Table */}
      <Card title="Error Logs">
        <DataModelTable<IErrorLogDto, ErrorLogListQuery>
          tableProps={tableProps}
          columns={ERROR_LOG_COLUMNS(!props.hideActions, props.parentView)}
          hideCreateButton={true}
        />
      </Card>
    </Space>
  );
};

export const routes: React.FC = () => {
  return (
    <Routes>
      <Route index element={<ErrorLogsList />} />
      <Route path="/:id/*" element={<ErrorLogView />} />
    </Routes>
  );
};

export const resources = [
  {
    name: 'OcppErrorLog',
    list: '/error-logs',
    show: '/error-logs/:id',
    meta: {
      canDelete: true,
      label: 'Error Logs',
    },
    icon: <MdOutlineErrorOutline />,
  },
];

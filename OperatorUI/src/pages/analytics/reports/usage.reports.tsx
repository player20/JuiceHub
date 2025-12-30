// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import React, { useState } from 'react';
import {
  Card,
  Flex,
  Typography,
  DatePicker,
  Button,
  Space,
  Row,
  Col,
  Statistic,
  Table,
  Select,
  message,
} from 'antd';
import {
  DownloadOutlined,
  FileExcelOutlined,
  FilePdfOutlined,
  BarChartOutlined,
} from '@ant-design/icons';
import { useCustom } from '@refinedev/core';
import { UsageTrendChart } from '../../../components/analytics';
import { GET_USAGE_SNAPSHOTS, GET_USAGE_AGGREGATE } from '../../../graphql/analytics-queries';
import dayjs from 'dayjs';
import './usage.reports.scss';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

type ReportType = 'usage' | 'performance' | 'revenue';

export const UsageReports: React.FC = () => {
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().subtract(30, 'day'),
    dayjs(),
  ]);
  const [reportType, setReportType] = useState<ReportType>('usage');

  const startDate = dateRange[0].format('YYYY-MM-DD');
  const endDate = dateRange[1].format('YYYY-MM-DD');

  // Get usage aggregate
  const { data: aggregateData, isLoading: aggregateLoading } = useCustom({
    url: '',
    method: 'post',
    meta: {
      operation: 'GetUsageAggregate',
      variables: {
        startDate: startDate,
        endDate: endDate,
      },
      gqlQuery: GET_USAGE_AGGREGATE,
    },
  } as any);

  // Get usage snapshots
  const { data: snapshotsData, isLoading: snapshotsLoading } = useCustom({
    url: '',
    method: 'post',
    meta: {
      operation: 'GetUsageSnapshots',
      variables: {
        startDate: startDate,
        endDate: endDate,
      },
      gqlQuery: GET_USAGE_SNAPSHOTS,
    },
  } as any);

  const aggregate = aggregateData?.data?.usage_snapshots_aggregate?.aggregate?.sum;
  const snapshots = snapshotsData?.data?.usage_snapshots || [];

  // Transform for chart
  const chartData = snapshots.map((s: any) => ({
    date: s.snapshot_date,
    label: dayjs(s.snapshot_date).format('MMM DD'),
    sessions: s.total_sessions || 0,
    energyKwh: s.total_energy_kwh || 0,
    revenue: s.total_revenue || 0,
  }));

  // Table data
  const tableData = snapshots.map((s: any) => ({
    key: s.id,
    date: s.snapshot_date,
    sessions: s.total_sessions || 0,
    energy: s.total_energy_kwh || 0,
    revenue: s.total_revenue || 0,
    duration: s.total_duration_minutes || 0,
    users: s.unique_users || 0,
  }));

  const handleExport = (format: 'csv' | 'pdf') => {
    message.success(`Exporting ${reportType} report as ${format.toUpperCase()}...`);
    // TODO: Implement actual export
  };

  const columns = [
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      render: (date: string) => dayjs(date).format('MMM DD, YYYY'),
    },
    {
      title: 'Sessions',
      dataIndex: 'sessions',
      key: 'sessions',
      sorter: (a: any, b: any) => a.sessions - b.sessions,
    },
    {
      title: 'Energy (kWh)',
      dataIndex: 'energy',
      key: 'energy',
      sorter: (a: any, b: any) => a.energy - b.energy,
      render: (energy: number) => energy.toFixed(2),
    },
    {
      title: 'Revenue',
      dataIndex: 'revenue',
      key: 'revenue',
      sorter: (a: any, b: any) => a.revenue - b.revenue,
      render: (revenue: number) => `$${revenue.toFixed(2)}`,
    },
    {
      title: 'Duration (hrs)',
      dataIndex: 'duration',
      key: 'duration',
      sorter: (a: any, b: any) => a.duration - b.duration,
      render: (duration: number) => (duration / 60).toFixed(1),
    },
    {
      title: 'Unique Users',
      dataIndex: 'users',
      key: 'users',
      sorter: (a: any, b: any) => a.users - b.users,
    },
  ];

  return (
    <div className="usage-reports">
      {/* Header */}
      <Flex justify="space-between" align="center" style={{ marginBottom: 24 }}>
        <div>
          <Title level={2} style={{ margin: 0 }}>
            Usage Reports
          </Title>
          <Text type="secondary">
            Detailed usage analytics and export tools
          </Text>
        </div>
        <Space>
          <Button
            icon={<FileExcelOutlined />}
            onClick={() => handleExport('csv')}
          >
            Export CSV
          </Button>
          <Button
            icon={<FilePdfOutlined />}
            onClick={() => handleExport('pdf')}
          >
            Export PDF
          </Button>
        </Space>
      </Flex>

      {/* Filters */}
      <Card style={{ marginBottom: 24 }}>
        <Flex gap={16} wrap="wrap">
          <Space>
            <Text strong>Report Type:</Text>
            <Select
              value={reportType}
              onChange={setReportType}
              style={{ width: 200 }}
            >
              <Select.Option value="usage">Usage Report</Select.Option>
              <Select.Option value="performance">Performance Report</Select.Option>
              <Select.Option value="revenue">Revenue Report</Select.Option>
            </Select>
          </Space>

          <Space>
            <Text strong>Date Range:</Text>
            <RangePicker
              value={dateRange}
              onChange={(dates) => {
                if (dates && dates[0] && dates[1]) {
                  setDateRange([dates[0], dates[1]]);
                }
              }}
              format="MMM DD, YYYY"
              presets={[
                { label: 'Last 7 Days', value: [dayjs().subtract(7, 'day'), dayjs()] },
                { label: 'Last 30 Days', value: [dayjs().subtract(30, 'day'), dayjs()] },
                { label: 'Last 90 Days', value: [dayjs().subtract(90, 'day'), dayjs()] },
                { label: 'This Month', value: [dayjs().startOf('month'), dayjs()] },
                { label: 'Last Month', value: [dayjs().subtract(1, 'month').startOf('month'), dayjs().subtract(1, 'month').endOf('month')] },
              ]}
            />
          </Space>
        </Flex>
      </Card>

      {/* Summary Statistics */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Sessions"
              value={aggregate?.total_sessions || 0}
              prefix={<BarChartOutlined />}
              loading={aggregateLoading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Energy Delivered"
              value={(aggregate?.total_energy_kwh || 0).toFixed(1)}
              suffix="kWh"
              loading={aggregateLoading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Revenue"
              value={(aggregate?.total_revenue || 0).toFixed(2)}
              prefix="$"
              loading={aggregateLoading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Avg Duration"
              value={
                aggregate?.total_sessions > 0
                  ? ((aggregate.total_duration_minutes || 0) / aggregate.total_sessions).toFixed(0)
                  : '0'
              }
              suffix="min"
              loading={aggregateLoading}
            />
          </Card>
        </Col>
      </Row>

      {/* Trend Chart */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col span={24}>
          <UsageTrendChart
            title={`${reportType === 'usage' ? 'Usage' : reportType === 'performance' ? 'Performance' : 'Revenue'} Trends`}
            data={chartData}
            loading={snapshotsLoading}
            height={350}
          />
        </Col>
      </Row>

      {/* Detailed Table */}
      <Card title="Daily Breakdown">
        <Table
          columns={columns}
          dataSource={tableData}
          loading={snapshotsLoading}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} days`,
          }}
          summary={(data) => {
            const totalSessions = data.reduce((sum, item) => sum + item.sessions, 0);
            const totalEnergy = data.reduce((sum, item) => sum + item.energy, 0);
            const totalRevenue = data.reduce((sum, item) => sum + item.revenue, 0);

            return (
              <Table.Summary fixed>
                <Table.Summary.Row style={{ fontWeight: 600 }}>
                  <Table.Summary.Cell index={0}>Total</Table.Summary.Cell>
                  <Table.Summary.Cell index={1}>{totalSessions}</Table.Summary.Cell>
                  <Table.Summary.Cell index={2}>{totalEnergy.toFixed(2)}</Table.Summary.Cell>
                  <Table.Summary.Cell index={3}>${totalRevenue.toFixed(2)}</Table.Summary.Cell>
                  <Table.Summary.Cell index={4}>-</Table.Summary.Cell>
                  <Table.Summary.Cell index={5}>-</Table.Summary.Cell>
                </Table.Summary.Row>
              </Table.Summary>
            );
          }}
        />
      </Card>
    </div>
  );
};

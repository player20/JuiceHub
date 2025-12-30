// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import React, { useState } from 'react';
import {
  Card,
  Flex,
  Typography,
  Row,
  Col,
  Segmented,
  Button,
  Space,
  Statistic,
  Table,
  Progress,
} from 'antd';
import {
  DownloadOutlined,
  ThunderboltOutlined,
  DollarOutlined,
  TrophyOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { useCustom, useNavigation } from '@refinedev/core';
import { TrendCard, UsageTrendChart } from '../../../components/analytics';
import {
  GET_USAGE_SNAPSHOTS,
  GET_USAGE_AGGREGATE,
  GET_STATION_PERFORMANCE,
  GET_LOW_PERFORMING_STATIONS,
  GET_NETWORK_SUMMARY,
} from '../../../graphql/analytics-queries';
import './analytics.dashboard.scss';

const { Title, Text } = Typography;

type TimePeriod = '7d' | '30d' | '90d';

export const AnalyticsDashboard: React.FC = () => {
  const { push } = useNavigation();
  const [period, setPeriod] = useState<TimePeriod>('7d');

  const getDateRange = (period: TimePeriod) => {
    const endDate = new Date().toISOString().split('T')[0];
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
    const startDate = new Date(Date.now() - days * 86400000)
      .toISOString()
      .split('T')[0];
    return { startDate, endDate };
  };

  const { startDate, endDate } = getDateRange(period);

  // Get usage aggregate data
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

  // Get usage snapshots for chart
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

  // Get low performing stations
  const { data: lowPerformingData, isLoading: lowPerformingLoading } = useCustom({
    url: '',
    method: 'post',
    meta: {
      operation: 'GetLowPerformingStations',
      variables: {
        threshold: { value: 70, type: 'Int', required: true },
        date: { value: new Date().toISOString().split('T')[0], type: 'date', required: true },
      },
      gqlQuery: GET_LOW_PERFORMING_STATIONS,
    },
  } as any);

  // Get network summary
  const { data: networkData, isLoading: networkLoading } = useCustom({
    url: '',
    method: 'post',
    meta: {
      operation: 'GetNetworkSummary',
      gqlQuery: GET_NETWORK_SUMMARY,
    },
  } as any);

  const aggregate = aggregateData?.data?.usage_snapshots_aggregate?.aggregate?.sum;
  const snapshots = snapshotsData?.data?.usage_snapshots || [];
  const lowPerforming = lowPerformingData?.data?.station_performance_daily || [];
  const network = networkData?.data;

  // Transform snapshots for chart
  const chartData = snapshots.map((s: any) => ({
    date: s.snapshot_date,
    label: new Date(s.snapshot_date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    }),
    sessions: s.total_sessions || 0,
    energyKwh: s.total_energy_kwh || 0,
    revenue: s.total_revenue || 0,
  }));

  // Low performing stations table columns
  const lowPerformingColumns = [
    {
      title: 'Station',
      dataIndex: ['ChargingStation', 'station_id'],
      key: 'station',
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: 'Health Score',
      dataIndex: 'health_score',
      key: 'health_score',
      render: (score: number) => (
        <Space>
          <Progress
            type="circle"
            percent={score}
            width={40}
            strokeColor={
              score >= 70 ? '#52c41a' : score >= 50 ? '#faad14' : '#f5222d'
            }
          />
          <Text type={score < 50 ? 'danger' : score < 70 ? 'warning' : undefined}>
            {score}/100
          </Text>
        </Space>
      ),
    },
    {
      title: 'Uptime',
      dataIndex: 'uptime_percentage',
      key: 'uptime',
      render: (uptime: number) => `${uptime.toFixed(1)}%`,
    },
    {
      title: 'Failed Sessions',
      dataIndex: 'failed_sessions',
      key: 'failed',
      render: (failed: number, record: any) => {
        const total = record.total_sessions || 1;
        const rate = ((failed / total) * 100).toFixed(1);
        return (
          <Text type={failed > 0 ? 'danger' : undefined}>
            {failed} ({rate}%)
          </Text>
        );
      },
    },
    {
      title: 'Action',
      key: 'action',
      render: (_: any, record: any) => (
        <Button
          type="link"
          onClick={() =>
            push(`/charging-stations/show/${record.ChargingStation.id}`)
          }
        >
          View Details
        </Button>
      ),
    },
  ];

  const handleExport = () => {
    // TODO: Implement export functionality
    console.log('Exporting analytics data...');
  };

  return (
    <div className="analytics-dashboard">
      {/* Header */}
      <Flex justify="space-between" align="center" style={{ marginBottom: 24 }}>
        <div>
          <Title level={2} style={{ margin: 0 }}>
            Analytics Dashboard
          </Title>
          <Text type="secondary">
            Network performance and usage insights
          </Text>
        </div>
        <Space>
          <Segmented
            options={[
              { label: 'Last 7 Days', value: '7d' },
              { label: 'Last 30 Days', value: '30d' },
              { label: 'Last 90 Days', value: '90d' },
            ]}
            value={period}
            onChange={(value) => setPeriod(value as TimePeriod)}
          />
          <Button icon={<DownloadOutlined />} onClick={handleExport}>
            Export Report
          </Button>
        </Space>
      </Flex>

      {/* Key Metrics Row */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <TrendCard
            title="Total Sessions"
            value={aggregate?.total_sessions || 0}
            subtitle={`in last ${period === '7d' ? '7' : period === '30d' ? '30' : '90'} days`}
            loading={aggregateLoading}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <TrendCard
            title="Energy Delivered"
            value={(aggregate?.total_energy_kwh || 0).toFixed(1)}
            suffix="kWh"
            subtitle="total consumption"
            loading={aggregateLoading}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <TrendCard
            title="Revenue Generated"
            value={(aggregate?.total_revenue || 0).toFixed(2)}
            prefix="$"
            subtitle="gross revenue"
            loading={aggregateLoading}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <TrendCard
            title="Avg Session"
            value={
              aggregate?.total_sessions > 0
                ? (
                    (aggregate.total_duration_minutes || 0) /
                    aggregate.total_sessions
                  ).toFixed(0)
                : '0'
            }
            suffix="min"
            subtitle="average duration"
            loading={aggregateLoading}
          />
        </Col>
      </Row>

      {/* Usage Trend Chart */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col span={24}>
          <UsageTrendChart
            title={`Usage Trends - Last ${period === '7d' ? '7' : period === '30d' ? '30' : '90'} Days`}
            data={chartData}
            loading={snapshotsLoading}
            height={350}
          />
        </Col>
      </Row>

      {/* Network Overview & Low Performing Stations */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={8}>
          <Card title="Network Overview" loading={networkLoading}>
            <Space direction="vertical" style={{ width: '100%' }} size="large">
              <Statistic
                title="Total Stations"
                value={network?.total_stations?.aggregate?.count || 0}
                prefix={<TrophyOutlined />}
              />
              <Statistic
                title="Active Stations"
                value={network?.active_stations?.aggregate?.count || 0}
                valueStyle={{ color: '#52c41a' }}
              />
              <Statistic
                title="Total Connectors"
                value={network?.total_connectors?.aggregate?.count || 0}
              />
              <Statistic
                title="All-Time Sessions"
                value={network?.all_time_sessions?.aggregate?.count || 0}
              />
              <Statistic
                title="All-Time Revenue"
                value={(network?.all_time_sessions?.aggregate?.sum?.total_cost || 0).toFixed(2)}
                prefix={<DollarOutlined />}
              />
            </Space>
          </Card>
        </Col>

        <Col xs={24} lg={16}>
          <Card
            title={
              <Flex justify="space-between" align="center">
                <Space>
                  <WarningOutlined style={{ color: '#faad14' }} />
                  <Text>Low Performing Stations</Text>
                </Space>
                <Button
                  type="link"
                  onClick={() => push('/analytics/performance')}
                >
                  View All
                </Button>
              </Flex>
            }
            loading={lowPerformingLoading}
          >
            {lowPerforming.length === 0 ? (
              <Flex
                justify="center"
                align="center"
                style={{ minHeight: 200, flexDirection: 'column' }}
              >
                <TrophyOutlined style={{ fontSize: 48, color: '#52c41a', marginBottom: 16 }} />
                <Text type="secondary">
                  All stations are performing well!
                </Text>
              </Flex>
            ) : (
              <Table
                dataSource={lowPerforming}
                columns={lowPerformingColumns}
                rowKey="id"
                pagination={{ pageSize: 5 }}
              />
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

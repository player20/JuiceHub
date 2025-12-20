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
  Statistic,
  Select,
  Table,
  Tag,
  Progress,
  Button,
  Space,
} from 'antd';
import {
  DollarOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  WarningOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import { useCustom, useNavigation } from '@refinedev/core';
import {
  GET_REVENUE_SUMMARY,
  GET_REVENUE_TRENDS,
  GET_TOP_REVENUE_STATIONS,
} from '../../../graphql/revenue-queries';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import dayjs from 'dayjs';
import './revenue.dashboard.scss';

const { Title, Text } = Typography;

type TimePeriod = '7d' | '30d' | '90d';

export const RevenueDashboard: React.FC = () => {
  const { push } = useNavigation();
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('30d');

  const periodDays = { '7d': 7, '30d': 30, '90d': 90 };
  const days = periodDays[timePeriod];

  const endDate = dayjs().format('YYYY-MM-DD');
  const startDate = dayjs().subtract(days, 'day').format('YYYY-MM-DD');

  // Get revenue summary
  const { data: summaryData, isLoading: summaryLoading } = useCustom({
    url: '',
    method: 'post',
    meta: {
      operation: 'GetRevenueSummary',
      variables: {
        startDate: { value: startDate, type: 'date', required: true },
        endDate: { value: endDate, type: 'date', required: true },
      },
      gqlQuery: GET_REVENUE_SUMMARY,
    },
  } as any);

  // Get revenue trends
  const { data: trendsData, isLoading: trendsLoading } = useCustom({
    url: '',
    method: 'post',
    meta: {
      operation: 'GetRevenueTrends',
      variables: {
        startDate: { value: startDate, type: 'date', required: true },
        endDate: { value: endDate, type: 'date', required: true },
      },
      gqlQuery: GET_REVENUE_TRENDS,
    },
  } as any);

  // Get top revenue stations
  const { data: topStationsData, isLoading: topStationsLoading } = useCustom({
    url: '',
    method: 'post',
    meta: {
      operation: 'GetTopRevenueStations',
      variables: {
        startDate: { value: startDate, type: 'date', required: true },
        endDate: { value: endDate, type: 'date', required: true },
        limit: { value: 10, type: 'Int', required: true },
      },
      gqlQuery: GET_TOP_REVENUE_STATIONS,
    },
  } as any);

  const summary = summaryData?.data?.revenue_daily_summary_aggregate?.aggregate?.sum || {};
  const trends = trendsData?.data?.revenue_daily_summary || [];
  const topStations = topStationsData?.data?.station_revenue_summary || [];

  // Transform for chart
  const chartData = trends.map((item: any) => ({
    date: item.date,
    label: dayjs(item.date).format('MMM DD'),
    revenue: item.total_revenue || 0,
    invoiced: item.total_invoiced || 0,
    paid: item.total_paid || 0,
  }));

  // Calculate collection rate
  const collectionRate =
    summary.total_invoiced > 0
      ? (summary.total_paid / summary.total_invoiced) * 100
      : 0;

  // Top stations table
  const stationsTableData = topStations.map((station: any, index: number) => ({
    key: station.charging_station_id,
    rank: index + 1,
    stationId: station.charging_station_id,
    location: station.ChargingStation?.Location?.name || 'Unknown',
    revenue: station.total_revenue || 0,
    sessions: station.total_sessions || 0,
    avgPerSession: station.avg_revenue_per_session || 0,
  }));

  const stationsColumns = [
    {
      title: '#',
      dataIndex: 'rank',
      key: 'rank',
      width: 50,
      render: (rank: number) => (
        <Tag color={rank === 1 ? 'gold' : rank === 2 ? 'silver' : rank === 3 ? 'bronze' : 'default'}>
          {rank}
        </Tag>
      ),
    },
    {
      title: 'Station ID',
      dataIndex: 'stationId',
      key: 'stationId',
      render: (text: string) => (
        <Button type="link" onClick={() => push(`/charging-stations/show/${text}`)}>
          {text}
        </Button>
      ),
    },
    {
      title: 'Location',
      dataIndex: 'location',
      key: 'location',
    },
    {
      title: 'Revenue',
      dataIndex: 'revenue',
      key: 'revenue',
      sorter: (a: any, b: any) => a.revenue - b.revenue,
      render: (revenue: number) => (
        <Text strong style={{ fontSize: 16 }}>
          ${revenue.toFixed(2)}
        </Text>
      ),
    },
    {
      title: 'Sessions',
      dataIndex: 'sessions',
      key: 'sessions',
      sorter: (a: any, b: any) => a.sessions - b.sessions,
    },
    {
      title: 'Avg/Session',
      dataIndex: 'avgPerSession',
      key: 'avgPerSession',
      sorter: (a: any, b: any) => a.avgPerSession - b.avgPerSession,
      render: (avg: number) => `$${avg.toFixed(2)}`,
    },
  ];

  return (
    <div className="revenue-dashboard">
      {/* Header */}
      <Flex justify="space-between" align="center" style={{ marginBottom: 24 }}>
        <div>
          <Title level={2} style={{ margin: 0 }}>
            Revenue Dashboard
          </Title>
          <Text type="secondary">Track invoicing, payments, and revenue trends</Text>
        </div>
        <Space>
          <Select value={timePeriod} onChange={setTimePeriod} style={{ width: 150 }}>
            <Select.Option value="7d">Last 7 Days</Select.Option>
            <Select.Option value="30d">Last 30 Days</Select.Option>
            <Select.Option value="90d">Last 90 Days</Select.Option>
          </Select>
          <Button
            type="primary"
            icon={<FileTextOutlined />}
            onClick={() => push('/revenue/invoices')}
          >
            View All Invoices
          </Button>
        </Space>
      </Flex>

      {/* Key Metrics */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Revenue"
              value={summary.total_revenue || 0}
              precision={2}
              prefix={<DollarOutlined />}
              loading={summaryLoading}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Invoiced"
              value={summary.total_invoiced || 0}
              precision={2}
              prefix={<FileTextOutlined />}
              loading={summaryLoading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Collected"
              value={summary.total_paid || 0}
              precision={2}
              prefix={<CheckCircleOutlined />}
              loading={summaryLoading}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Flex vertical gap={8}>
              <Text type="secondary">Collection Rate</Text>
              <Progress
                percent={Math.round(collectionRate)}
                strokeColor={{
                  '0%': '#108ee9',
                  '100%': '#87d068',
                }}
                status={collectionRate >= 90 ? 'success' : collectionRate >= 70 ? 'normal' : 'exception'}
              />
              <Text strong style={{ fontSize: 20 }}>
                {collectionRate.toFixed(1)}%
              </Text>
            </Flex>
          </Card>
        </Col>
      </Row>

      {/* Outstanding Amounts */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12}>
          <Card>
            <Statistic
              title="Pending Payments"
              value={summary.total_pending || 0}
              precision={2}
              prefix={<ClockCircleOutlined />}
              loading={summaryLoading}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12}>
          <Card>
            <Statistic
              title="Overdue Invoices"
              value={summary.total_overdue || 0}
              precision={2}
              prefix={<WarningOutlined />}
              loading={summaryLoading}
              valueStyle={{ color: '#f5222d' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Revenue Trends Chart */}
      <Card title="Revenue Trends" style={{ marginBottom: 24 }}>
        <ResponsiveContainer width="100%" height={350}>
          <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#52c41a" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#52c41a" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorInvoiced" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#1890ff" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#1890ff" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorPaid" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#faad14" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#faad14" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" />
            <YAxis />
            <Tooltip
              formatter={(value: number) => `$${value.toFixed(2)}`}
              contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.96)' }}
            />
            <Legend />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#52c41a"
              strokeWidth={2}
              fill="url(#colorRevenue)"
              name="Revenue"
            />
            <Area
              type="monotone"
              dataKey="invoiced"
              stroke="#1890ff"
              strokeWidth={2}
              fill="url(#colorInvoiced)"
              name="Invoiced"
            />
            <Area
              type="monotone"
              dataKey="paid"
              stroke="#faad14"
              strokeWidth={2}
              fill="url(#colorPaid)"
              name="Paid"
            />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      {/* Top Revenue Stations */}
      <Card
        title="Top Revenue Stations"
        extra={
          <Button
            type="link"
            icon={<DownloadOutlined />}
            onClick={() => push('/analytics/reports')}
          >
            Export Report
          </Button>
        }
      >
        <Table
          columns={stationsColumns}
          dataSource={stationsTableData}
          loading={topStationsLoading}
          pagination={false}
          size="small"
        />
      </Card>
    </div>
  );
};

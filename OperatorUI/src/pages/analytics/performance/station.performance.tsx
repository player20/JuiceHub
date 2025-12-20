// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import React, { useState } from 'react';
import {
  Card,
  Flex,
  Typography,
  Table,
  Tag,
  Progress,
  Button,
  Input,
  Select,
  Space,
  Tooltip,
  Badge,
} from 'antd';
import {
  SearchOutlined,
  FilterOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  MinusOutlined,
  WarningOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { useCustom, useNavigation } from '@refinedev/core';
import { GET_STATION_PERFORMANCE } from '../../../graphql/analytics-queries';
import './station.performance.scss';

const { Title, Text } = Typography;

type HealthStatus = 'all' | 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
type TrendType = 'improving' | 'stable' | 'declining';

export const StationPerformance: React.FC = () => {
  const { push } = useNavigation();
  const [searchText, setSearchText] = useState('');
  const [healthFilter, setHealthFilter] = useState<HealthStatus>('all');

  const endDate = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - 7 * 86400000)
    .toISOString()
    .split('T')[0];

  const { data, isLoading } = useCustom({
    url: '',
    method: 'post',
    meta: {
      operation: 'GetStationPerformance',
      variables: {
        startDate: { value: startDate, type: 'date', required: true },
        endDate: { value: endDate, type: 'date', required: true },
      },
      gqlQuery: GET_STATION_PERFORMANCE,
    },
  } as any);

  const performanceData = data?.data?.station_performance_daily || [];

  // Group by station and calculate averages
  const stationStats = performanceData.reduce((acc: any, record: any) => {
    const stationId = record.charging_station_id;

    if (!acc[stationId]) {
      acc[stationId] = {
        stationId,
        records: [],
      };
    }

    acc[stationId].records.push(record);
    return acc;
  }, {});

  const tableData = Object.values(stationStats).map((station: any) => {
    const { stationId, records } = station;

    const avgHealth =
      records.reduce((sum: number, r: any) => sum + (r.health_score || 0), 0) /
      records.length;

    const avgUptime =
      records.reduce(
        (sum: number, r: any) => sum + (r.uptime_percentage || 0),
        0
      ) / records.length;

    const totalSessions = records.reduce(
      (sum: number, r: any) => sum + (r.total_sessions || 0),
      0
    );

    const failedSessions = records.reduce(
      (sum: number, r: any) => sum + (r.failed_sessions || 0),
      0
    );

    const successRate =
      totalSessions > 0 ? ((totalSessions - failedSessions) / totalSessions) * 100 : 0;

    // Determine status
    let status: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
    if (avgHealth >= 90) status = 'excellent';
    else if (avgHealth >= 70) status = 'good';
    else if (avgHealth >= 50) status = 'fair';
    else if (avgHealth >= 30) status = 'poor';
    else status = 'critical';

    // Calculate trend (compare first half vs second half)
    const midpoint = Math.floor(records.length / 2);
    const firstHalfAvg =
      records
        .slice(0, midpoint)
        .reduce((sum: number, r: any) => sum + (r.health_score || 0), 0) /
      midpoint;

    const secondHalfAvg =
      records
        .slice(midpoint)
        .reduce((sum: number, r: any) => sum + (r.health_score || 0), 0) /
      (records.length - midpoint);

    let trend: TrendType;
    if (secondHalfAvg > firstHalfAvg + 5) trend = 'improving';
    else if (secondHalfAvg < firstHalfAvg - 5) trend = 'declining';
    else trend = 'stable';

    return {
      key: stationId,
      stationId,
      healthScore: Math.round(avgHealth),
      status,
      trend,
      uptime: avgUptime,
      sessions: totalSessions,
      successRate,
      failedSessions,
    };
  });

  // Filter data
  const filteredData = tableData.filter((item: any) => {
    const matchesSearch =
      !searchText ||
      item.stationId.toLowerCase().includes(searchText.toLowerCase());

    const matchesHealth =
      healthFilter === 'all' || item.status === healthFilter;

    return matchesSearch && matchesHealth;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent':
        return 'green';
      case 'good':
        return 'blue';
      case 'fair':
        return 'orange';
      case 'poor':
        return 'red';
      case 'critical':
        return 'red';
      default:
        return 'default';
    }
  };

  const getTrendIcon = (trend: TrendType) => {
    switch (trend) {
      case 'improving':
        return <ArrowUpOutlined style={{ color: '#52c41a' }} />;
      case 'declining':
        return <ArrowDownOutlined style={{ color: '#f5222d' }} />;
      case 'stable':
        return <MinusOutlined style={{ color: '#8c8c8c' }} />;
    }
  };

  const columns = [
    {
      title: 'Station ID',
      dataIndex: 'stationId',
      key: 'stationId',
      fixed: 'left' as const,
      width: 200,
      render: (text: string) => (
        <Button type="link" onClick={() => push(`/charging-stations/show/${text}`)}>
          {text}
        </Button>
      ),
    },
    {
      title: 'Health Score',
      dataIndex: 'healthScore',
      key: 'healthScore',
      width: 150,
      sorter: (a: any, b: any) => a.healthScore - b.healthScore,
      render: (score: number, record: any) => (
        <Space>
          <Progress
            type="circle"
            percent={score}
            width={50}
            strokeColor={
              score >= 90
                ? '#52c41a'
                : score >= 70
                ? '#1890ff'
                : score >= 50
                ? '#faad14'
                : '#f5222d'
            }
          />
          <Flex vertical>
            <Text strong>{score}/100</Text>
            <Tag color={getStatusColor(record.status)}>{record.status}</Tag>
          </Flex>
        </Space>
      ),
    },
    {
      title: 'Trend',
      dataIndex: 'trend',
      key: 'trend',
      width: 100,
      filters: [
        { text: 'Improving', value: 'improving' },
        { text: 'Stable', value: 'stable' },
        { text: 'Declining', value: 'declining' },
      ],
      onFilter: (value: any, record: any) => record.trend === value,
      render: (trend: TrendType) => (
        <Tooltip title={trend}>
          {getTrendIcon(trend)}
        </Tooltip>
      ),
    },
    {
      title: 'Uptime',
      dataIndex: 'uptime',
      key: 'uptime',
      width: 120,
      sorter: (a: any, b: any) => a.uptime - b.uptime,
      render: (uptime: number) => (
        <Text type={uptime < 80 ? 'danger' : undefined}>
          {uptime.toFixed(1)}%
        </Text>
      ),
    },
    {
      title: 'Sessions',
      dataIndex: 'sessions',
      key: 'sessions',
      width: 100,
      sorter: (a: any, b: any) => a.sessions - b.sessions,
    },
    {
      title: 'Success Rate',
      dataIndex: 'successRate',
      key: 'successRate',
      width: 120,
      sorter: (a: any, b: any) => a.successRate - b.successRate,
      render: (rate: number) => (
        <Text type={rate < 90 ? 'warning' : undefined}>
          {rate.toFixed(1)}%
        </Text>
      ),
    },
    {
      title: 'Failed',
      dataIndex: 'failedSessions',
      key: 'failedSessions',
      width: 100,
      sorter: (a: any, b: any) => a.failedSessions - b.failedSessions,
      render: (failed: number) => (
        <Badge
          count={failed}
          showZero
          style={{
            backgroundColor: failed > 0 ? '#f5222d' : '#52c41a',
          }}
        />
      ),
    },
    {
      title: 'Issues',
      key: 'issues',
      width: 100,
      render: (_: any, record: any) => {
        const issues = [];

        if (record.healthScore < 70) {
          issues.push('Low Health');
        }
        if (record.uptime < 80) {
          issues.push('Low Uptime');
        }
        if (record.successRate < 90) {
          issues.push('High Failures');
        }

        if (issues.length === 0) {
          return (
            <Tooltip title="No issues detected">
              <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 18 }} />
            </Tooltip>
          );
        }

        return (
          <Tooltip title={issues.join(', ')}>
            <WarningOutlined style={{ color: '#faad14', fontSize: 18 }} />
          </Tooltip>
        );
      },
    },
  ];

  return (
    <div className="station-performance">
      <Flex justify="space-between" align="center" style={{ marginBottom: 24 }}>
        <div>
          <Title level={2} style={{ margin: 0 }}>
            Station Performance
          </Title>
          <Text type="secondary">
            Detailed health scores and performance metrics
          </Text>
        </div>
      </Flex>

      <Card>
        {/* Filters */}
        <Flex gap={16} style={{ marginBottom: 16 }}>
          <Input
            placeholder="Search stations..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 300 }}
          />
          <Select
            value={healthFilter}
            onChange={setHealthFilter}
            style={{ width: 200 }}
            prefix={<FilterOutlined />}
          >
            <Select.Option value="all">All Statuses</Select.Option>
            <Select.Option value="excellent">Excellent (90+)</Select.Option>
            <Select.Option value="good">Good (70-89)</Select.Option>
            <Select.Option value="fair">Fair (50-69)</Select.Option>
            <Select.Option value="poor">Poor (30-49)</Select.Option>
            <Select.Option value="critical">Critical (&lt;30)</Select.Option>
          </Select>
        </Flex>

        {/* Performance Table */}
        <Table
          columns={columns}
          dataSource={filteredData}
          loading={isLoading}
          scroll={{ x: 1200 }}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} stations`,
          }}
        />
      </Card>
    </div>
  );
};

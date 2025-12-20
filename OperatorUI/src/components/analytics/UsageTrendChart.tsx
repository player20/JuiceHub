// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import React, { useState } from 'react';
import { Card, Flex, Typography, Spin, Segmented } from 'antd';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import './UsageTrendChart.scss';

const { Title, Text } = Typography;

export interface UsageTrendDataPoint {
  date: string;
  label: string;
  sessions: number;
  energyKwh: number;
  revenue: number;
}

export interface UsageTrendChartProps {
  title?: string;
  data: UsageTrendDataPoint[];
  loading?: boolean;
  height?: number;
  showLegend?: boolean;
  defaultMetric?: 'sessions' | 'energy' | 'revenue';
}

/**
 * UsageTrendChart - Multi-metric line/area chart for usage trends
 *
 * Features:
 * - Switch between sessions, energy, and revenue metrics
 * - Responsive design with Recharts
 * - Custom tooltips with formatted values
 * - Line or area chart styles
 * - Date-based X-axis
 */
export const UsageTrendChart: React.FC<UsageTrendChartProps> = ({
  title = 'Usage Trends',
  data,
  loading = false,
  height = 300,
  showLegend = true,
  defaultMetric = 'sessions',
}) => {
  const [selectedMetric, setSelectedMetric] = useState<
    'sessions' | 'energy' | 'revenue'
  >(defaultMetric);

  const metricConfig = {
    sessions: {
      label: 'Sessions',
      color: '#1890ff',
      format: (value: number) => value.toLocaleString(),
    },
    energy: {
      label: 'Energy (kWh)',
      color: '#52c41a',
      format: (value: number) => `${value.toFixed(1)} kWh`,
    },
    revenue: {
      label: 'Revenue',
      color: '#722ed1',
      format: (value: number) => `$${value.toFixed(2)}`,
    },
  };

  const currentConfig = metricConfig[selectedMetric];

  const formatTooltipValue = (value: number) => {
    return currentConfig.format(value);
  };

  const formatYAxisValue = (value: number) => {
    if (selectedMetric === 'revenue') {
      return `$${value}`;
    } else if (selectedMetric === 'energy') {
      return `${value}`;
    }
    return value.toString();
  };

  if (loading) {
    return (
      <Card className="usage-trend-chart">
        <Flex justify="center" align="center" style={{ minHeight: height }}>
          <Spin />
        </Flex>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card className="usage-trend-chart">
        <Flex vertical gap={16}>
          <Title level={4}>{title}</Title>
          <Flex justify="center" align="center" style={{ minHeight: height }}>
            <Text type="secondary">No data available</Text>
          </Flex>
        </Flex>
      </Card>
    );
  }

  return (
    <Card className="usage-trend-chart">
      <Flex vertical gap={16}>
        {/* Header */}
        <Flex justify="space-between" align="center">
          <Title level={4} style={{ margin: 0 }}>
            {title}
          </Title>
          <Segmented
            options={[
              { label: 'Sessions', value: 'sessions' },
              { label: 'Energy', value: 'energy' },
              { label: 'Revenue', value: 'revenue' },
            ]}
            value={selectedMetric}
            onChange={(value) =>
              setSelectedMetric(value as 'sessions' | 'energy' | 'revenue')
            }
          />
        </Flex>

        {/* Chart */}
        <ResponsiveContainer width="100%" height={height}>
          <AreaChart
            data={data}
            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorMetric" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor={currentConfig.color}
                  stopOpacity={0.3}
                />
                <stop
                  offset="95%"
                  stopColor={currentConfig.color}
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: '#d9d9d9' }}
            />
            <YAxis
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: '#d9d9d9' }}
              tickFormatter={formatYAxisValue}
            />
            <Tooltip
              formatter={formatTooltipValue}
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #d9d9d9',
                borderRadius: '4px',
              }}
            />
            {showLegend && (
              <Legend
                wrapperStyle={{ paddingTop: '10px' }}
                formatter={() => currentConfig.label}
              />
            )}
            <Area
              type="monotone"
              dataKey={selectedMetric}
              stroke={currentConfig.color}
              strokeWidth={2}
              fill="url(#colorMetric)"
              name={currentConfig.label}
            />
          </AreaChart>
        </ResponsiveContainer>

        {/* Summary Stats */}
        <Flex gap={24} justify="space-around" className="chart-summary">
          <Flex vertical align="center">
            <Text type="secondary" style={{ fontSize: 12 }}>
              Total Sessions
            </Text>
            <Text strong style={{ fontSize: 16 }}>
              {data.reduce((sum, d) => sum + d.sessions, 0).toLocaleString()}
            </Text>
          </Flex>
          <Flex vertical align="center">
            <Text type="secondary" style={{ fontSize: 12 }}>
              Total Energy
            </Text>
            <Text strong style={{ fontSize: 16 }}>
              {data.reduce((sum, d) => sum + d.energyKwh, 0).toFixed(1)} kWh
            </Text>
          </Flex>
          <Flex vertical align="center">
            <Text type="secondary" style={{ fontSize: 12 }}>
              Total Revenue
            </Text>
            <Text strong style={{ fontSize: 16 }}>
              ${data.reduce((sum, d) => sum + d.revenue, 0).toFixed(2)}
            </Text>
          </Flex>
        </Flex>
      </Flex>
    </Card>
  );
};

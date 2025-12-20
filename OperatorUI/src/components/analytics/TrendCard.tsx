// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { Card, Flex, Typography, Spin } from 'antd';
import {
  ArrowUpOutlined,
  ArrowDownOutlined,
  MinusOutlined,
} from '@ant-design/icons';
import './TrendCard.scss';

const { Text, Title } = Typography;

export interface TrendCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  trend?: {
    value: number;
    label?: string;
  };
  sparklineData?: number[];
  loading?: boolean;
  onClick?: () => void;
  valueFormatter?: (value: number | string) => string;
  prefix?: string;
  suffix?: string;
}

/**
 * TrendCard - Reusable metric card with trend indicator and optional sparkline
 *
 * Features:
 * - Large metric display
 * - Trend percentage with up/down/neutral indicator
 * - Optional sparkline visualization
 * - Click handler for navigation
 * - Custom value formatting
 */
export const TrendCard: React.FC<TrendCardProps> = ({
  title,
  value,
  subtitle,
  trend,
  sparklineData,
  loading = false,
  onClick,
  valueFormatter,
  prefix = '',
  suffix = '',
}) => {
  const formatValue = (val: number | string): string => {
    if (valueFormatter) {
      return valueFormatter(val);
    }
    if (typeof val === 'number') {
      return val.toLocaleString();
    }
    return val;
  };

  const getTrendIcon = (trendValue: number) => {
    if (trendValue > 0) {
      return <ArrowUpOutlined className="trend-icon trend-up" />;
    } else if (trendValue < 0) {
      return <ArrowDownOutlined className="trend-icon trend-down" />;
    }
    return <MinusOutlined className="trend-icon trend-neutral" />;
  };

  const getTrendClass = (trendValue: number): string => {
    if (trendValue > 0) return 'trend-up';
    if (trendValue < 0) return 'trend-down';
    return 'trend-neutral';
  };

  const renderSparkline = () => {
    if (!sparklineData || sparklineData.length === 0) return null;

    // Simple SVG sparkline
    const width = 100;
    const height = 30;
    const padding = 2;

    const max = Math.max(...sparklineData, 1);
    const min = Math.min(...sparklineData, 0);
    const range = max - min || 1;

    const points = sparklineData
      .map((value, index) => {
        const x = (index / (sparklineData.length - 1)) * (width - padding * 2) + padding;
        const y = height - ((value - min) / range) * (height - padding * 2) - padding;
        return `${x},${y}`;
      })
      .join(' ');

    return (
      <svg width={width} height={height} className="sparkline">
        <polyline
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          points={points}
        />
      </svg>
    );
  };

  if (loading) {
    return (
      <Card className="trend-card" onClick={onClick}>
        <Flex justify="center" align="center" style={{ minHeight: 120 }}>
          <Spin />
        </Flex>
      </Card>
    );
  }

  return (
    <Card
      className={`trend-card ${onClick ? 'clickable' : ''}`}
      onClick={onClick}
      hoverable={!!onClick}
    >
      <Flex vertical gap={12}>
        {/* Header */}
        <Flex justify="space-between" align="center">
          <Text type="secondary" className="trend-card-title">
            {title}
          </Text>
          {sparklineData && renderSparkline()}
        </Flex>

        {/* Value */}
        <Flex align="baseline" gap={4}>
          {prefix && <Text className="trend-card-prefix">{prefix}</Text>}
          <Title level={2} className="trend-card-value" style={{ margin: 0 }}>
            {formatValue(value)}
          </Title>
          {suffix && <Text className="trend-card-suffix">{suffix}</Text>}
        </Flex>

        {/* Trend and Subtitle */}
        <Flex justify="space-between" align="center">
          {subtitle && (
            <Text type="secondary" className="trend-card-subtitle">
              {subtitle}
            </Text>
          )}
          {trend && (
            <Flex align="center" gap={4} className={getTrendClass(trend.value)}>
              {getTrendIcon(trend.value)}
              <Text className="trend-value">
                {Math.abs(trend.value).toFixed(1)}%
              </Text>
              {trend.label && (
                <Text type="secondary" className="trend-label">
                  {trend.label}
                </Text>
              )}
            </Flex>
          )}
        </Flex>
      </Flex>
    </Card>
  );
};

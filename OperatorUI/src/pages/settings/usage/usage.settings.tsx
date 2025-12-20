// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import {
  Typography,
  Card,
  Progress,
  Row,
  Col,
  Statistic,
  Table,
  Tag,
  Button,
  Space,
  Alert,
} from 'antd';
import {
  ThunderboltOutlined,
  ApiOutlined,
  DatabaseOutlined,
  TeamOutlined,
  RocketOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const { Title, Text, Paragraph } = Typography;

export const UsageSettings: React.FC = () => {
  const navigate = useNavigate();

  // Mock usage data (would come from multi-tenancy API)
  const quotas = {
    plan: 'Professional',
    stations: { current: 42, limit: 100, unit: 'stations' },
    apiCalls: { current: 12500, limit: 50000, unit: 'per hour' },
    storage: { current: 15.5, limit: 50, unit: 'GB' },
    teamMembers: { current: 4, limit: 10, unit: 'members' },
  };

  // Usage history
  const usageHistory = [
    {
      date: '2024-01',
      stations: 38,
      apiCalls: 45000,
      storage: 12.3,
    },
    {
      date: '2024-02',
      stations: 40,
      apiCalls: 48000,
      storage: 13.8,
    },
    {
      date: '2024-03',
      stations: 42,
      apiCalls: 50000,
      storage: 15.5,
    },
  ];

  const getProgressColor = (percentage: number) => {
    if (percentage < 70) return '#52c41a';
    if (percentage < 90) return '#faad14';
    return '#f5222d';
  };

  const getProgressStatus = (percentage: number) => {
    if (percentage < 70) return 'normal';
    if (percentage < 90) return 'active';
    return 'exception';
  };

  const calculatePercentage = (current: number, limit: number) => {
    return (current / limit) * 100;
  };

  const historyColumns = [
    {
      title: 'Month',
      dataIndex: 'date',
      key: 'date',
    },
    {
      title: 'Stations',
      dataIndex: 'stations',
      key: 'stations',
    },
    {
      title: 'API Calls',
      dataIndex: 'apiCalls',
      key: 'apiCalls',
      render: (value: number) => value.toLocaleString(),
    },
    {
      title: 'Storage (GB)',
      dataIndex: 'storage',
      key: 'storage',
      render: (value: number) => value.toFixed(1),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
        <div>
          <Title level={3}>Usage & Quotas</Title>
          <Text type="secondary">
            Monitor your resource usage and plan limits
          </Text>
        </div>
        <Space>
          <Tag color="blue">{quotas.plan} Plan</Tag>
          <Button
            type="primary"
            icon={<RocketOutlined />}
            onClick={() => navigate('/settings/billing')}
          >
            Upgrade Plan
          </Button>
        </Space>
      </div>

      {/* Warning Alert for High Usage */}
      {calculatePercentage(quotas.apiCalls.current, quotas.apiCalls.limit) > 80 && (
        <Alert
          message="High API Usage Detected"
          description="You're approaching your API call limit. Consider upgrading your plan to avoid service interruptions."
          type="warning"
          showIcon
          icon={<WarningOutlined />}
          style={{ marginTop: 24, marginBottom: 24 }}
          action={
            <Button size="small" onClick={() => navigate('/settings/billing')}>
              View Plans
            </Button>
          }
        />
      )}

      {/* Current Usage Cards */}
      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Charging Stations"
              value={quotas.stations.current}
              suffix={`/ ${quotas.stations.limit}`}
              prefix={<ThunderboltOutlined />}
            />
            <Progress
              percent={calculatePercentage(quotas.stations.current, quotas.stations.limit)}
              strokeColor={getProgressColor(calculatePercentage(quotas.stations.current, quotas.stations.limit))}
              status={getProgressStatus(calculatePercentage(quotas.stations.current, quotas.stations.limit))}
              showInfo={false}
              style={{ marginTop: 16 }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="API Calls"
              value={quotas.apiCalls.current.toLocaleString()}
              suffix={`/ ${quotas.apiCalls.limit.toLocaleString()}/hr`}
              prefix={<ApiOutlined />}
            />
            <Progress
              percent={calculatePercentage(quotas.apiCalls.current, quotas.apiCalls.limit)}
              strokeColor={getProgressColor(calculatePercentage(quotas.apiCalls.current, quotas.apiCalls.limit))}
              status={getProgressStatus(calculatePercentage(quotas.apiCalls.current, quotas.apiCalls.limit))}
              showInfo={false}
              style={{ marginTop: 16 }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Storage"
              value={quotas.storage.current}
              suffix={`/ ${quotas.storage.limit} GB`}
              prefix={<DatabaseOutlined />}
              precision={1}
            />
            <Progress
              percent={calculatePercentage(quotas.storage.current, quotas.storage.limit)}
              strokeColor={getProgressColor(calculatePercentage(quotas.storage.current, quotas.storage.limit))}
              status={getProgressStatus(calculatePercentage(quotas.storage.current, quotas.storage.limit))}
              showInfo={false}
              style={{ marginTop: 16 }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Team Members"
              value={quotas.teamMembers.current}
              suffix={`/ ${quotas.teamMembers.limit}`}
              prefix={<TeamOutlined />}
            />
            <Progress
              percent={calculatePercentage(quotas.teamMembers.current, quotas.teamMembers.limit)}
              strokeColor={getProgressColor(calculatePercentage(quotas.teamMembers.current, quotas.teamMembers.limit))}
              status={getProgressStatus(calculatePercentage(quotas.teamMembers.current, quotas.teamMembers.limit))}
              showInfo={false}
              style={{ marginTop: 16 }}
            />
          </Card>
        </Col>
      </Row>

      {/* Detailed Breakdown */}
      <Card title="Usage Breakdown" style={{ marginTop: 24 }}>
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text strong>Charging Stations ({quotas.stations.current} / {quotas.stations.limit})</Text>
              <Text>{calculatePercentage(quotas.stations.current, quotas.stations.limit).toFixed(0)}% used</Text>
            </div>
            <Progress
              percent={calculatePercentage(quotas.stations.current, quotas.stations.limit)}
              strokeColor={getProgressColor(calculatePercentage(quotas.stations.current, quotas.stations.limit))}
            />
            <Paragraph type="secondary" style={{ marginTop: 8 }}>
              Add {quotas.stations.limit - quotas.stations.current} more stations before reaching your limit
            </Paragraph>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text strong>API Calls ({quotas.apiCalls.current.toLocaleString()} / {quotas.apiCalls.limit.toLocaleString()} per hour)</Text>
              <Text>{calculatePercentage(quotas.apiCalls.current, quotas.apiCalls.limit).toFixed(0)}% used</Text>
            </div>
            <Progress
              percent={calculatePercentage(quotas.apiCalls.current, quotas.apiCalls.limit)}
              strokeColor={getProgressColor(calculatePercentage(quotas.apiCalls.current, quotas.apiCalls.limit))}
            />
            <Paragraph type="secondary" style={{ marginTop: 8 }}>
              Current rate: {quotas.apiCalls.current.toLocaleString()} calls/hour. Resets every hour.
            </Paragraph>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text strong>Storage ({quotas.storage.current} / {quotas.storage.limit} GB)</Text>
              <Text>{calculatePercentage(quotas.storage.current, quotas.storage.limit).toFixed(0)}% used</Text>
            </div>
            <Progress
              percent={calculatePercentage(quotas.storage.current, quotas.storage.limit)}
              strokeColor={getProgressColor(calculatePercentage(quotas.storage.current, quotas.storage.limit))}
            />
            <Paragraph type="secondary" style={{ marginTop: 8 }}>
              {(quotas.storage.limit - quotas.storage.current).toFixed(1)} GB available
            </Paragraph>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text strong>Team Members ({quotas.teamMembers.current} / {quotas.teamMembers.limit})</Text>
              <Text>{calculatePercentage(quotas.teamMembers.current, quotas.teamMembers.limit).toFixed(0)}% used</Text>
            </div>
            <Progress
              percent={calculatePercentage(quotas.teamMembers.current, quotas.teamMembers.limit)}
              strokeColor={getProgressColor(calculatePercentage(quotas.teamMembers.current, quotas.teamMembers.limit))}
            />
            <Paragraph type="secondary" style={{ marginTop: 8 }}>
              Invite {quotas.teamMembers.limit - quotas.teamMembers.current} more team members
            </Paragraph>
          </div>
        </Space>
      </Card>

      {/* Usage History */}
      <Card title="Usage History" style={{ marginTop: 24 }}>
        <Table
          columns={historyColumns}
          dataSource={usageHistory}
          rowKey="date"
          pagination={false}
        />
      </Card>
    </div>
  );
};

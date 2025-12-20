// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import {
  Card,
  Flex,
  Typography,
  Row,
  Col,
  Statistic,
  Table,
  Tag,
  Button,
  Space,
  Badge,
  Timeline,
  Empty,
} from 'antd';
import {
  BellOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  FireOutlined,
  EyeOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { useCustom, useNavigation } from '@refinedev/core';
import {
  GET_ALERT_STATS,
  GET_ACTIVE_ALERTS,
  GET_INCIDENTS,
  GET_NOTIFICATIONS,
} from '../../../graphql/alerts-queries';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import './alerts.dashboard.scss';

dayjs.extend(relativeTime);

const { Title, Text } = Typography;

export const AlertsDashboard: React.FC = () => {
  const { push } = useNavigation();

  const endDate = dayjs().toISOString();
  const startDate = dayjs().subtract(7, 'day').toISOString();

  // Get alert statistics
  const { data: statsData, isLoading: statsLoading } = useCustom({
    url: '',
    method: 'post',
    meta: {
      operation: 'GetAlertStats',
      variables: {
        startDate: { value: startDate, type: 'timestamptz', required: true },
        endDate: { value: endDate, type: 'timestamptz', required: true },
      },
      gqlQuery: GET_ALERT_STATS,
    },
  } as any);

  // Get active alerts
  const { data: alertsData, isLoading: alertsLoading } = useCustom({
    url: '',
    method: 'post',
    meta: {
      operation: 'GetActiveAlerts',
      variables: {
        limit: { value: 10, type: 'Int', required: true },
        offset: { value: 0, type: 'Int', required: true },
        where: {
          value: { status: { _eq: 'active' } },
          type: 'alerts_bool_exp',
          required: false,
        },
      },
      gqlQuery: GET_ACTIVE_ALERTS,
    },
  } as any);

  // Get recent incidents
  const { data: incidentsData, isLoading: incidentsLoading } = useCustom({
    url: '',
    method: 'post',
    meta: {
      operation: 'GetIncidents',
      variables: {
        limit: { value: 5, type: 'Int', required: true },
        offset: { value: 0, type: 'Int', required: true },
        where: {
          value: { status: { _in: ['open', 'investigating'] } },
          type: 'incidents_bool_exp',
          required: false,
        },
        orderBy: {
          value: [{ created_at: 'desc' }],
          type: '[incidents_order_by!]',
          required: false,
        },
      },
      gqlQuery: GET_INCIDENTS,
    },
  } as any);

  // Get recent notifications
  const { data: notificationsData, isLoading: notificationsLoading } = useCustom({
    url: '',
    method: 'post',
    meta: {
      operation: 'GetNotifications',
      variables: {
        limit: { value: 10, type: 'Int', required: true },
        offset: { value: 0, type: 'Int', required: true },
        where: { value: {}, type: 'notifications_bool_exp', required: false },
      },
      gqlQuery: GET_NOTIFICATIONS,
    },
  } as any);

  const stats = statsData?.data || {};
  const activeAlerts = alertsData?.data?.alerts || [];
  const incidents = incidentsData?.data?.incidents || [];
  const notifications = notificationsData?.data?.notifications || [];

  const getSeverityColor = (severity: string): string => {
    switch (severity) {
      case 'critical':
        return 'error';
      case 'high':
        return 'warning';
      case 'medium':
        return 'processing';
      case 'low':
        return 'default';
      default:
        return 'default';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <FireOutlined style={{ color: '#f5222d' }} />;
      case 'high':
        return <WarningOutlined style={{ color: '#fa8c16' }} />;
      case 'medium':
        return <ExclamationCircleOutlined style={{ color: '#1890ff' }} />;
      case 'low':
        return <BellOutlined style={{ color: '#8c8c8c' }} />;
      default:
        return <BellOutlined />;
    }
  };

  const alertsColumns = [
    {
      title: 'Severity',
      dataIndex: 'severity',
      key: 'severity',
      width: 100,
      render: (severity: string) => (
        <Space>
          {getSeverityIcon(severity)}
          <Tag color={getSeverityColor(severity)}>{severity.toUpperCase()}</Tag>
        </Space>
      ),
    },
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      render: (title: string, record: any) => (
        <Flex vertical gap={4}>
          <Text strong>{title}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.message}
          </Text>
        </Flex>
      ),
    },
    {
      title: 'Station',
      dataIndex: 'ChargingStation',
      key: 'station',
      width: 150,
      render: (station: any) => station?.station_id || '-',
    },
    {
      title: 'Triggered',
      dataIndex: 'triggered_at',
      key: 'triggered_at',
      width: 120,
      render: (date: string) => (
        <Text type="secondary">{dayjs(date).fromNow()}</Text>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_: any, record: any) => (
        <Button
          type="link"
          size="small"
          icon={<EyeOutlined />}
          onClick={() => push(`/alerts/active/${record.id}`)}
        >
          View
        </Button>
      ),
    },
  ];

  return (
    <div className="alerts-dashboard">
      {/* Header */}
      <Flex justify="space-between" align="center" style={{ marginBottom: 24 }}>
        <div>
          <Title level={2} style={{ margin: 0 }}>
            Alerts Dashboard
          </Title>
          <Text type="secondary">Monitor system alerts and incidents</Text>
        </div>
        <Space>
          <Button icon={<SettingOutlined />} onClick={() => push('/alerts/rules')}>
            Alert Rules
          </Button>
          <Button type="primary" onClick={() => push('/alerts/active')}>
            View All Alerts
          </Button>
        </Space>
      </Flex>

      {/* Key Metrics */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Active Alerts"
              value={stats.active_alerts?.aggregate?.count || 0}
              prefix={<BellOutlined />}
              loading={statsLoading}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Critical Alerts (7d)"
              value={stats.critical_alerts?.aggregate?.count || 0}
              prefix={<FireOutlined />}
              loading={statsLoading}
              valueStyle={{ color: '#f5222d' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Open Incidents"
              value={stats.open_incidents?.aggregate?.count || 0}
              prefix={<WarningOutlined />}
              loading={statsLoading}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Alerts (7d)"
              value={stats.alerts_aggregate?.aggregate?.count || 0}
              prefix={<CheckCircleOutlined />}
              loading={statsLoading}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        {/* Left Column - Active Alerts */}
        <Col xs={24} lg={16}>
          <Card
            title="Active Alerts"
            extra={
              <Button type="link" onClick={() => push('/alerts/active')}>
                View All
              </Button>
            }
            style={{ marginBottom: 16 }}
          >
            <Table
              columns={alertsColumns}
              dataSource={activeAlerts}
              loading={alertsLoading}
              rowKey="id"
              pagination={false}
              size="small"
              locale={{
                emptyText: (
                  <Empty
                    description="No active alerts"
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                  />
                ),
              }}
            />
          </Card>

          {/* Recent Incidents */}
          <Card
            title="Recent Incidents"
            extra={
              <Button type="link" onClick={() => push('/alerts/incidents')}>
                View All
              </Button>
            }
          >
            {incidents.length > 0 ? (
              <Table
                dataSource={incidents}
                loading={incidentsLoading}
                rowKey="id"
                pagination={false}
                size="small"
                columns={[
                  {
                    title: 'Incident #',
                    dataIndex: 'incident_number',
                    key: 'incident_number',
                    width: 120,
                  },
                  {
                    title: 'Title',
                    dataIndex: 'title',
                    key: 'title',
                  },
                  {
                    title: 'Severity',
                    dataIndex: 'severity',
                    key: 'severity',
                    width: 100,
                    render: (severity: string) => (
                      <Tag color={getSeverityColor(severity)}>
                        {severity.toUpperCase()}
                      </Tag>
                    ),
                  },
                  {
                    title: 'Status',
                    dataIndex: 'status',
                    key: 'status',
                    width: 120,
                    render: (status: string) => (
                      <Badge
                        status={status === 'open' ? 'error' : 'processing'}
                        text={status}
                      />
                    ),
                  },
                  {
                    title: 'Alerts',
                    key: 'alerts',
                    width: 80,
                    render: (_: any, record: any) => (
                      <Tag>{record.Alerts_aggregate?.aggregate?.count || 0}</Tag>
                    ),
                  },
                ]}
              />
            ) : (
              <Empty
                description="No open incidents"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            )}
          </Card>
        </Col>

        {/* Right Column - Notifications Timeline */}
        <Col xs={24} lg={8}>
          <Card title="Recent Notifications">
            {notifications.length > 0 ? (
              <Timeline
                items={notifications.map((notification: any) => ({
                  color:
                    notification.status === 'sent'
                      ? 'green'
                      : notification.status === 'failed'
                      ? 'red'
                      : 'gray',
                  children: (
                    <Flex vertical gap={4}>
                      <Flex justify="space-between" align="center">
                        <Space>
                          <Tag>{notification.channel}</Tag>
                          <Tag
                            color={
                              notification.status === 'sent' ? 'success' : 'error'
                            }
                          >
                            {notification.status}
                          </Tag>
                        </Space>
                      </Flex>
                      <Text strong style={{ fontSize: 13 }}>
                        {notification.Alert?.title || 'Alert'}
                      </Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        To: {notification.recipient}
                      </Text>
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        {dayjs(notification.created_at).format('MMM DD, HH:mm')}
                      </Text>
                      {notification.failure_reason && (
                        <Text type="danger" style={{ fontSize: 11 }}>
                          {notification.failure_reason}
                        </Text>
                      )}
                    </Flex>
                  ),
                }))}
              />
            ) : (
              <Empty
                description="No notifications"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

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
  Button,
  Input,
  Select,
  Space,
  Badge,
  Tooltip,
  Modal,
  Popconfirm,
  message,
  Descriptions,
} from 'antd';
import {
  SearchOutlined,
  FilterOutlined,
  CheckOutlined,
  CloseOutlined,
  EyeOutlined,
  FireOutlined,
  WarningOutlined,
  ExclamationCircleOutlined,
  BellOutlined,
} from '@ant-design/icons';
import { useCustom, useNavigation } from '@refinedev/core';
import {
  GET_ACTIVE_ALERTS,
  GET_ALERT_DETAIL,
  ACKNOWLEDGE_ALERT,
  RESOLVE_ALERT,
} from '../../../graphql/alerts-queries';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import './active.alerts.scss';

dayjs.extend(relativeTime);

const { Title, Text } = Typography;

type AlertStatus = 'active' | 'acknowledged' | 'resolved';

export const ActiveAlerts: React.FC = () => {
  const { push } = useNavigation();
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<AlertStatus | 'all'>('all');
  const [severityFilter, setSeverityFilter] = useState<string | 'all'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);

  // Build where clause
  const whereClause: any = {};

  if (searchText) {
    whereClause._or = [
      { title: { _ilike: `%${searchText}%` } },
      { message: { _ilike: `%${searchText}%` } },
      { charging_station_id: { _ilike: `%${searchText}%` } },
    ];
  }

  if (statusFilter !== 'all') {
    whereClause.status = { _eq: statusFilter };
  }

  if (severityFilter !== 'all') {
    whereClause.severity = { _eq: severityFilter };
  }

  const { data, isLoading, refetch } = useCustom({
    url: '',
    method: 'post',
    meta: {
      operation: 'GetActiveAlerts',
      variables: {
        limit: { value: pageSize, type: 'Int', required: true },
        offset: { value: (currentPage - 1) * pageSize, type: 'Int', required: true },
        where: { value: whereClause, type: 'alerts_bool_exp', required: false },
      },
      gqlQuery: GET_ACTIVE_ALERTS,
    },
  } as any);

  // Get alert detail
  const { data: detailData, isLoading: detailLoading } = useCustom({
    url: '',
    method: 'post',
    meta: {
      operation: 'GetAlertDetail',
      variables: {
        id: { value: selectedAlertId, type: 'uuid', required: true },
      },
      gqlQuery: GET_ALERT_DETAIL,
    },
    queryOptions: {
      enabled: !!selectedAlertId,
    },
  } as any);

  const alerts = data?.data?.alerts || [];
  const totalCount = data?.data?.alerts_aggregate?.aggregate?.count || 0;
  const alertDetail = detailData?.data?.alerts_by_pk;

  const handleViewDetail = (alertId: string) => {
    setSelectedAlertId(alertId);
    setDetailModalVisible(true);
  };

  const handleAcknowledge = async (alertId: string) => {
    try {
      // TODO: Implement actual mutation with current user
      console.log('Acknowledging alert:', alertId);
      message.success('Alert acknowledged');
      refetch();
    } catch (error) {
      message.error('Failed to acknowledge alert');
    }
  };

  const handleResolve = async (alertId: string) => {
    try {
      // TODO: Implement actual mutation with current user
      console.log('Resolving alert:', alertId);
      message.success('Alert resolved');
      refetch();
    } catch (error) {
      message.error('Failed to resolve alert');
    }
  };

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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return 'error';
      case 'acknowledged':
        return 'processing';
      case 'resolved':
        return 'success';
      default:
        return 'default';
    }
  };

  const columns = [
    {
      title: 'Severity',
      dataIndex: 'severity',
      key: 'severity',
      width: 120,
      fixed: 'left' as const,
      render: (severity: string) => (
        <Space>
          {getSeverityIcon(severity)}
          <Tag color={getSeverityColor(severity)}>{severity.toUpperCase()}</Tag>
        </Space>
      ),
    },
    {
      title: 'Alert',
      key: 'alert',
      render: (_: any, record: any) => (
        <Flex vertical gap={4}>
          <Text strong>{record.title}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.message}
          </Text>
          <Space size={4}>
            <Tag color="blue">{record.metric_name}</Tag>
            <Text code style={{ fontSize: 11 }}>
              {record.metric_value} {record.comparison_operator} {record.threshold_value}
            </Text>
          </Space>
        </Flex>
      ),
    },
    {
      title: 'Station',
      dataIndex: 'ChargingStation',
      key: 'station',
      width: 150,
      render: (station: any) => (
        <Button type="link" onClick={() => push(`/charging-stations/show/${station?.id}`)}>
          {station?.station_id || '-'}
        </Button>
      ),
    },
    {
      title: 'Rule',
      dataIndex: 'AlertRule',
      key: 'rule',
      width: 150,
      render: (rule: any) => rule?.name || '-',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      filters: [
        { text: 'Active', value: 'active' },
        { text: 'Acknowledged', value: 'acknowledged' },
        { text: 'Resolved', value: 'resolved' },
      ],
      render: (status: string) => (
        <Badge status={getStatusBadge(status)} text={status.toUpperCase()} />
      ),
    },
    {
      title: 'Triggered',
      dataIndex: 'triggered_at',
      key: 'triggered_at',
      width: 120,
      sorter: true,
      render: (date: string) => (
        <Tooltip title={dayjs(date).format('MMM DD, YYYY HH:mm:ss')}>
          <Text type="secondary">{dayjs(date).fromNow()}</Text>
        </Tooltip>
      ),
    },
    {
      title: 'Incident',
      dataIndex: 'Incident',
      key: 'incident',
      width: 120,
      render: (incident: any) =>
        incident ? (
          <Button
            type="link"
            size="small"
            onClick={() => push(`/alerts/incidents/${incident.id}`)}
          >
            {incident.incident_number}
          </Button>
        ) : (
          '-'
        ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 160,
      fixed: 'right' as const,
      render: (_: any, record: any) => (
        <Space size="small">
          <Tooltip title="View Details">
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => handleViewDetail(record.id)}
            />
          </Tooltip>
          {record.status === 'active' && (
            <Tooltip title="Acknowledge">
              <Popconfirm
                title="Acknowledge this alert?"
                onConfirm={() => handleAcknowledge(record.id)}
                okText="Yes"
              >
                <Button type="text" size="small" icon={<CheckOutlined />} />
              </Popconfirm>
            </Tooltip>
          )}
          {record.status !== 'resolved' && (
            <Tooltip title="Resolve">
              <Popconfirm
                title="Mark this alert as resolved?"
                onConfirm={() => handleResolve(record.id)}
                okText="Resolve"
              >
                <Button type="text" size="small" icon={<CloseOutlined />} />
              </Popconfirm>
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="active-alerts">
      {/* Header */}
      <Flex justify="space-between" align="center" style={{ marginBottom: 24 }}>
        <div>
          <Title level={2} style={{ margin: 0 }}>
            Active Alerts
          </Title>
          <Text type="secondary">Monitor and manage system alerts</Text>
        </div>
      </Flex>

      {/* Filters */}
      <Card style={{ marginBottom: 24 }}>
        <Flex gap={16} wrap="wrap">
          <Input
            placeholder="Search alerts..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 300 }}
            allowClear
          />
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            style={{ width: 150 }}
          >
            <Select.Option value="all">All Statuses</Select.Option>
            <Select.Option value="active">Active</Select.Option>
            <Select.Option value="acknowledged">Acknowledged</Select.Option>
            <Select.Option value="resolved">Resolved</Select.Option>
          </Select>
          <Select
            value={severityFilter}
            onChange={setSeverityFilter}
            style={{ width: 150 }}
          >
            <Select.Option value="all">All Severities</Select.Option>
            <Select.Option value="critical">Critical</Select.Option>
            <Select.Option value="high">High</Select.Option>
            <Select.Option value="medium">Medium</Select.Option>
            <Select.Option value="low">Low</Select.Option>
          </Select>
        </Flex>
      </Card>

      {/* Alerts Table */}
      <Card>
        <Table
          columns={columns}
          dataSource={alerts}
          loading={isLoading}
          rowKey="id"
          scroll={{ x: 1400 }}
          pagination={{
            current: currentPage,
            pageSize: pageSize,
            total: totalCount,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} alerts`,
            onChange: (page, size) => {
              setCurrentPage(page);
              setPageSize(size);
            },
          }}
        />
      </Card>

      {/* Alert Detail Modal */}
      <Modal
        title="Alert Details"
        open={detailModalVisible}
        onCancel={() => {
          setDetailModalVisible(false);
          setSelectedAlertId(null);
        }}
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            Close
          </Button>,
          alertDetail?.status === 'active' && (
            <Button
              key="acknowledge"
              onClick={() => {
                handleAcknowledge(alertDetail.id);
                setDetailModalVisible(false);
              }}
            >
              Acknowledge
            </Button>
          ),
          alertDetail?.status !== 'resolved' && (
            <Button
              key="resolve"
              type="primary"
              onClick={() => {
                handleResolve(alertDetail.id);
                setDetailModalVisible(false);
              }}
            >
              Resolve
            </Button>
          ),
        ]}
        width={700}
      >
        {alertDetail && (
          <Descriptions column={1} bordered>
            <Descriptions.Item label="Title">{alertDetail.title}</Descriptions.Item>
            <Descriptions.Item label="Message">{alertDetail.message}</Descriptions.Item>
            <Descriptions.Item label="Severity">
              <Space>
                {getSeverityIcon(alertDetail.severity)}
                <Tag color={getSeverityColor(alertDetail.severity)}>
                  {alertDetail.severity.toUpperCase()}
                </Tag>
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="Status">
              <Badge
                status={getStatusBadge(alertDetail.status)}
                text={alertDetail.status.toUpperCase()}
              />
            </Descriptions.Item>
            <Descriptions.Item label="Metric">
              {alertDetail.metric_name}: {alertDetail.metric_value} (threshold:{' '}
              {alertDetail.threshold_value})
            </Descriptions.Item>
            <Descriptions.Item label="Station">
              {alertDetail.ChargingStation?.station_id || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Rule">{alertDetail.AlertRule?.name || '-'}</Descriptions.Item>
            <Descriptions.Item label="Triggered">
              {dayjs(alertDetail.triggered_at).format('MMM DD, YYYY HH:mm:ss')}
            </Descriptions.Item>
            {alertDetail.acknowledged_at && (
              <>
                <Descriptions.Item label="Acknowledged">
                  {dayjs(alertDetail.acknowledged_at).format('MMM DD, YYYY HH:mm:ss')}
                </Descriptions.Item>
                <Descriptions.Item label="Acknowledged By">
                  {alertDetail.acknowledged_by || '-'}
                </Descriptions.Item>
              </>
            )}
            {alertDetail.resolved_at && (
              <>
                <Descriptions.Item label="Resolved">
                  {dayjs(alertDetail.resolved_at).format('MMM DD, YYYY HH:mm:ss')}
                </Descriptions.Item>
                <Descriptions.Item label="Resolved By">
                  {alertDetail.resolved_by || '-'}
                </Descriptions.Item>
              </>
            )}
            {alertDetail.Incident && (
              <Descriptions.Item label="Incident">
                <Button
                  type="link"
                  onClick={() => push(`/alerts/incidents/${alertDetail.Incident.id}`)}
                >
                  {alertDetail.Incident.incident_number} - {alertDetail.Incident.title}
                </Button>
              </Descriptions.Item>
            )}
            {alertDetail.Notifications && alertDetail.Notifications.length > 0 && (
              <Descriptions.Item label="Notifications">
                {alertDetail.Notifications.map((n: any) => (
                  <Tag key={n.id} color={n.status === 'sent' ? 'success' : 'error'}>
                    {n.channel}: {n.status}
                  </Tag>
                ))}
              </Descriptions.Item>
            )}
          </Descriptions>
        )}
      </Modal>
    </div>
  );
};

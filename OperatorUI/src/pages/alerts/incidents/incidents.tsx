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
  Modal,
  Form,
  Descriptions,
  Timeline,
  Empty,
  message,
  Popconfirm,
} from 'antd';
import {
  SearchOutlined,
  EyeOutlined,
  CheckOutlined,
  WarningOutlined,
  FireOutlined,
  ExclamationCircleOutlined,
  BellOutlined,
  CommentOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import { useCustom, useNavigation } from '@refinedev/core';
import {
  GET_INCIDENTS,
  GET_INCIDENT_DETAIL,
  UPDATE_INCIDENT,
  CREATE_INCIDENT_NOTE,
} from '../../../graphql/alerts-queries';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import './incidents.scss';

dayjs.extend(relativeTime);

const { Title, Text } = Typography;
const { TextArea } = Input;

type IncidentStatus = 'open' | 'investigating' | 'resolved' | 'closed';

export const Incidents: React.FC = () => {
  const { push } = useNavigation();
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<IncidentStatus | 'all'>('all');
  const [severityFilter, setSeverityFilter] = useState<string | 'all'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [noteModalVisible, setNoteModalVisible] = useState(false);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [noteForm] = Form.useForm();

  // Build where clause
  const whereClause: any = {};

  if (searchText) {
    whereClause._or = [
      { incident_number: { _ilike: `%${searchText}%` } },
      { title: { _ilike: `%${searchText}%` } },
      { description: { _ilike: `%${searchText}%` } },
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
      operation: 'GetIncidents',
      variables: {
        limit: { value: pageSize, type: 'Int', required: true },
        offset: { value: (currentPage - 1) * pageSize, type: 'Int', required: true },
        where: { value: whereClause, type: 'incidents_bool_exp', required: false },
        orderBy: {
          value: [{ created_at: 'desc' }],
          type: '[incidents_order_by!]',
          required: false,
        },
      },
      gqlQuery: GET_INCIDENTS,
    },
  } as any);

  // Get incident detail
  const { data: detailData, isLoading: detailLoading, refetch: refetchDetail } = useCustom({
    url: '',
    method: 'post',
    meta: {
      operation: 'GetIncidentDetail',
      variables: {
        id: { value: selectedIncidentId, type: 'uuid', required: true },
      },
      gqlQuery: GET_INCIDENT_DETAIL,
    },
    queryOptions: {
      enabled: !!selectedIncidentId,
    },
  } as any);

  const incidents = data?.data?.incidents || [];
  const totalCount = data?.data?.incidents_aggregate?.aggregate?.count || 0;
  const incidentDetail = detailData?.data?.incidents_by_pk;

  const handleViewDetail = (incidentId: string) => {
    setSelectedIncidentId(incidentId);
    setDetailModalVisible(true);
  };

  const handleUpdateStatus = async (incidentId: string, status: string) => {
    try {
      // TODO: Implement actual mutation with current user
      console.log('Updating incident status:', incidentId, status);
      message.success('Incident status updated');
      refetch();
      if (selectedIncidentId === incidentId) {
        refetchDetail();
      }
    } catch (error) {
      message.error('Failed to update incident status');
    }
  };

  const handleAddNote = async () => {
    try {
      const values = await noteForm.validateFields();
      // TODO: Implement actual mutation with current user
      console.log('Adding note:', selectedIncidentId, values.note);
      message.success('Note added');
      noteForm.resetFields();
      setNoteModalVisible(false);
      refetchDetail();
    } catch (error) {
      message.error('Failed to add note');
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
      case 'open':
        return 'error';
      case 'investigating':
        return 'processing';
      case 'resolved':
        return 'success';
      case 'closed':
        return 'default';
      default:
        return 'default';
    }
  };

  const columns = [
    {
      title: 'Incident #',
      dataIndex: 'incident_number',
      key: 'incident_number',
      width: 120,
      fixed: 'left' as const,
      render: (text: string) => <Text code>{text}</Text>,
    },
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      render: (title: string, record: any) => (
        <Flex vertical gap={4}>
          <Text strong>{title}</Text>
          {record.description && (
            <Text type="secondary" style={{ fontSize: 12 }} ellipsis>
              {record.description}
            </Text>
          )}
        </Flex>
      ),
    },
    {
      title: 'Severity',
      dataIndex: 'severity',
      key: 'severity',
      width: 120,
      filters: [
        { text: 'Critical', value: 'critical' },
        { text: 'High', value: 'high' },
        { text: 'Medium', value: 'medium' },
        { text: 'Low', value: 'low' },
      ],
      render: (severity: string) => (
        <Space>
          {getSeverityIcon(severity)}
          <Tag color={getSeverityColor(severity)}>{severity.toUpperCase()}</Tag>
        </Space>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      filters: [
        { text: 'Open', value: 'open' },
        { text: 'Investigating', value: 'investigating' },
        { text: 'Resolved', value: 'resolved' },
        { text: 'Closed', value: 'closed' },
      ],
      render: (status: string) => (
        <Badge status={getStatusBadge(status)} text={status.toUpperCase()} />
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
      title: 'Alerts',
      key: 'alerts',
      width: 80,
      render: (_: any, record: any) => (
        <Tag color="blue">{record.Alerts_aggregate?.aggregate?.count || 0}</Tag>
      ),
    },
    {
      title: 'Created',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 120,
      sorter: true,
      render: (date: string) => (
        <Text type="secondary">{dayjs(date).fromNow()}</Text>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 200,
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
          {record.status === 'open' && (
            <Popconfirm
              title="Mark as investigating?"
              onConfirm={() => handleUpdateStatus(record.id, 'investigating')}
            >
              <Button type="text" size="small">
                Investigate
              </Button>
            </Popconfirm>
          )}
          {record.status === 'investigating' && (
            <Popconfirm
              title="Mark as resolved?"
              onConfirm={() => handleUpdateStatus(record.id, 'resolved')}
            >
              <Button type="text" size="small" icon={<CheckOutlined />}>
                Resolve
              </Button>
            </Popconfirm>
          )}
          {record.status === 'resolved' && (
            <Popconfirm
              title="Close this incident?"
              onConfirm={() => handleUpdateStatus(record.id, 'closed')}
            >
              <Button type="text" size="small" icon={<CloseOutlined />}>
                Close
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="incidents">
      {/* Header */}
      <Flex justify="space-between" align="center" style={{ marginBottom: 24 }}>
        <div>
          <Title level={2} style={{ margin: 0 }}>
            Incidents
          </Title>
          <Text type="secondary">Track and manage system incidents</Text>
        </div>
      </Flex>

      {/* Filters */}
      <Card style={{ marginBottom: 24 }}>
        <Flex gap={16} wrap="wrap">
          <Input
            placeholder="Search incidents..."
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
            <Select.Option value="open">Open</Select.Option>
            <Select.Option value="investigating">Investigating</Select.Option>
            <Select.Option value="resolved">Resolved</Select.Option>
            <Select.Option value="closed">Closed</Select.Option>
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

      {/* Incidents Table */}
      <Card>
        <Table
          columns={columns}
          dataSource={incidents}
          loading={isLoading}
          rowKey="id"
          scroll={{ x: 1400 }}
          pagination={{
            current: currentPage,
            pageSize: pageSize,
            total: totalCount,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} incidents`,
            onChange: (page, size) => {
              setCurrentPage(page);
              setPageSize(size);
            },
          }}
        />
      </Card>

      {/* Incident Detail Modal */}
      <Modal
        title={`Incident ${incidentDetail?.incident_number || ''}`}
        open={detailModalVisible}
        onCancel={() => {
          setDetailModalVisible(false);
          setSelectedIncidentId(null);
        }}
        footer={[
          <Button
            key="note"
            icon={<CommentOutlined />}
            onClick={() => setNoteModalVisible(true)}
          >
            Add Note
          </Button>,
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            Close
          </Button>,
        ]}
        width={800}
      >
        {incidentDetail && (
          <>
            <Descriptions column={2} bordered style={{ marginBottom: 24 }}>
              <Descriptions.Item label="Title" span={2}>
                {incidentDetail.title}
              </Descriptions.Item>
              <Descriptions.Item label="Description" span={2}>
                {incidentDetail.description || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Severity">
                <Space>
                  {getSeverityIcon(incidentDetail.severity)}
                  <Tag color={getSeverityColor(incidentDetail.severity)}>
                    {incidentDetail.severity.toUpperCase()}
                  </Tag>
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                <Badge
                  status={getStatusBadge(incidentDetail.status)}
                  text={incidentDetail.status.toUpperCase()}
                />
              </Descriptions.Item>
              <Descriptions.Item label="Station">
                {incidentDetail.ChargingStation?.station_id || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Created">
                {dayjs(incidentDetail.created_at).format('MMM DD, YYYY HH:mm:ss')}
              </Descriptions.Item>
              {incidentDetail.acknowledged_at && (
                <Descriptions.Item label="Acknowledged">
                  {dayjs(incidentDetail.acknowledged_at).format('MMM DD, YYYY HH:mm:ss')}
                </Descriptions.Item>
              )}
              {incidentDetail.resolved_at && (
                <Descriptions.Item label="Resolved">
                  {dayjs(incidentDetail.resolved_at).format('MMM DD, YYYY HH:mm:ss')}
                </Descriptions.Item>
              )}
            </Descriptions>

            {/* Related Alerts */}
            <Card title="Related Alerts" size="small" style={{ marginBottom: 16 }}>
              {incidentDetail.Alerts && incidentDetail.Alerts.length > 0 ? (
                <Timeline
                  items={incidentDetail.Alerts.map((alert: any) => ({
                    color: alert.status === 'resolved' ? 'green' : 'red',
                    children: (
                      <Flex vertical gap={4}>
                        <Flex justify="space-between">
                          <Text strong>{alert.title}</Text>
                          <Tag color={getSeverityColor(alert.severity)}>
                            {alert.severity}
                          </Tag>
                        </Flex>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {alert.message}
                        </Text>
                        <Text type="secondary" style={{ fontSize: 11 }}>
                          {dayjs(alert.triggered_at).format('MMM DD, HH:mm')}
                        </Text>
                      </Flex>
                    ),
                  }))}
                />
              ) : (
                <Empty description="No alerts" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              )}
            </Card>

            {/* Notes */}
            <Card title="Notes" size="small">
              {incidentDetail.Notes && incidentDetail.Notes.length > 0 ? (
                <Timeline
                  items={incidentDetail.Notes.map((note: any) => ({
                    children: (
                      <Flex vertical gap={4}>
                        <Text>{note.note}</Text>
                        <Text type="secondary" style={{ fontSize: 11 }}>
                          {note.created_by} - {dayjs(note.created_at).format('MMM DD, HH:mm')}
                        </Text>
                      </Flex>
                    ),
                  }))}
                />
              ) : (
                <Empty description="No notes" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              )}
            </Card>
          </>
        )}
      </Modal>

      {/* Add Note Modal */}
      <Modal
        title="Add Note"
        open={noteModalVisible}
        onCancel={() => {
          setNoteModalVisible(false);
          noteForm.resetFields();
        }}
        onOk={handleAddNote}
        okText="Add Note"
      >
        <Form form={noteForm} layout="vertical">
          <Form.Item
            label="Note"
            name="note"
            rules={[{ required: true, message: 'Please enter a note' }]}
          >
            <TextArea rows={4} placeholder="Enter incident note..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

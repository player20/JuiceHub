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
  Switch,
  Space,
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  message,
  Tooltip,
  Popconfirm,
  Badge,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  BellOutlined,
  MailOutlined,
  MessageOutlined,
  LinkOutlined,
  WarningOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import { useCustom } from '@refinedev/core';
import {
  GET_ALERT_RULES,
  CREATE_ALERT_RULE,
  UPDATE_ALERT_RULE,
  DELETE_ALERT_RULE,
} from '../../../graphql/alerts-queries';
import './alert.rules.scss';

const { Title, Text } = Typography;
const { TextArea } = Input;

export const AlertRules: React.FC = () => {
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRule, setEditingRule] = useState<any>(null);
  const [form] = Form.useForm();

  const { data, isLoading, refetch } = useCustom({
    url: '',
    method: 'post',
    meta: {
      operation: 'GetAlertRules',
      variables: {
        where: { value: {}, type: 'alert_rules_bool_exp', required: false },
        orderBy: {
          value: [{ created_at: 'desc' }],
          type: '[alert_rules_order_by!]',
          required: false,
        },
      },
      gqlQuery: GET_ALERT_RULES,
    },
  } as any);

  const rules = data?.data?.alert_rules || [];

  const handleCreate = () => {
    setEditingRule(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (rule: any) => {
    setEditingRule(rule);
    form.setFieldsValue({
      ...rule,
      threshold_value: parseFloat(rule.threshold_value),
    });
    setModalVisible(true);
  };

  const handleDelete = async (id: string) => {
    try {
      // TODO: Implement actual mutation
      console.log('Deleting rule:', id);
      message.success('Alert rule deleted');
      refetch();
    } catch (error) {
      message.error('Failed to delete rule');
    }
  };

  const handleToggleEnabled = async (id: string, enabled: boolean) => {
    try {
      // TODO: Implement actual mutation
      console.log('Toggling rule:', id, enabled);
      message.success(`Alert rule ${enabled ? 'enabled' : 'disabled'}`);
      refetch();
    } catch (error) {
      message.error('Failed to update rule');
    }
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();

      if (editingRule) {
        // TODO: Implement actual mutation
        console.log('Updating rule:', editingRule.id, values);
        message.success('Alert rule updated');
      } else {
        // TODO: Implement actual mutation
        console.log('Creating rule:', values);
        message.success('Alert rule created');
      }

      setModalVisible(false);
      refetch();
    } catch (error) {
      console.error('Failed to save rule:', error);
      message.error('Failed to save rule');
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

  const columns = [
    {
      title: 'Enabled',
      dataIndex: 'is_enabled',
      key: 'is_enabled',
      width: 80,
      render: (enabled: boolean, record: any) => (
        <Switch
          checked={enabled}
          onChange={(checked) => handleToggleEnabled(record.id, checked)}
        />
      ),
    },
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      render: (name: string, record: any) => (
        <Flex vertical gap={4}>
          <Text strong>{name}</Text>
          {record.description && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              {record.description}
            </Text>
          )}
        </Flex>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'rule_type',
      key: 'rule_type',
      width: 120,
      filters: [
        { text: 'Threshold', value: 'threshold' },
        { text: 'Anomaly', value: 'anomaly' },
        { text: 'Pattern', value: 'pattern' },
      ],
      render: (type: string) => <Tag>{type}</Tag>,
    },
    {
      title: 'Severity',
      dataIndex: 'severity',
      key: 'severity',
      width: 100,
      filters: [
        { text: 'Critical', value: 'critical' },
        { text: 'High', value: 'high' },
        { text: 'Medium', value: 'medium' },
        { text: 'Low', value: 'low' },
      ],
      render: (severity: string) => (
        <Tag color={getSeverityColor(severity)}>{severity.toUpperCase()}</Tag>
      ),
    },
    {
      title: 'Metric',
      dataIndex: 'metric_name',
      key: 'metric_name',
      width: 150,
    },
    {
      title: 'Condition',
      key: 'condition',
      width: 150,
      render: (_: any, record: any) => (
        <Text code>
          {record.comparison_operator} {record.threshold_value}
        </Text>
      ),
    },
    {
      title: 'Time Window',
      dataIndex: 'time_window_minutes',
      key: 'time_window_minutes',
      width: 120,
      render: (minutes: number) => `${minutes} min`,
    },
    {
      title: 'Notifications',
      key: 'notifications',
      width: 120,
      render: (_: any, record: any) => (
        <Space size={4}>
          {record.notify_email && (
            <Tooltip title="Email">
              <MailOutlined style={{ color: '#1890ff' }} />
            </Tooltip>
          )}
          {record.notify_sms && (
            <Tooltip title="SMS">
              <MessageOutlined style={{ color: '#52c41a' }} />
            </Tooltip>
          )}
          {record.notify_webhook && (
            <Tooltip title="Webhook">
              <LinkOutlined style={{ color: '#fa8c16' }} />
            </Tooltip>
          )}
          {record.create_incident && (
            <Tooltip title="Create Incident">
              <WarningOutlined style={{ color: '#f5222d' }} />
            </Tooltip>
          )}
        </Space>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      fixed: 'right' as const,
      render: (_: any, record: any) => (
        <Space size="small">
          <Tooltip title="Edit">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Popconfirm
            title="Delete alert rule?"
            description="This action cannot be undone."
            onConfirm={() => handleDelete(record.id)}
            okText="Delete"
            okButtonProps={{ danger: true }}
          >
            <Tooltip title="Delete">
              <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined />}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="alert-rules">
      {/* Header */}
      <Flex justify="space-between" align="center" style={{ marginBottom: 24 }}>
        <div>
          <Title level={2} style={{ margin: 0 }}>
            Alert Rules
          </Title>
          <Text type="secondary">Configure automated alert conditions</Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          Create Alert Rule
        </Button>
      </Flex>

      {/* Rules Table */}
      <Card>
        <Table
          columns={columns}
          dataSource={rules}
          loading={isLoading}
          rowKey="id"
          scroll={{ x: 1400 }}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} rules`,
          }}
        />
      </Card>

      {/* Create/Edit Modal */}
      <Modal
        title={editingRule ? 'Edit Alert Rule' : 'Create Alert Rule'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={handleSave}
        width={700}
        okText={editingRule ? 'Update' : 'Create'}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="Rule Name"
            name="name"
            rules={[{ required: true, message: 'Please enter rule name' }]}
          >
            <Input placeholder="e.g., High Error Rate Alert" />
          </Form.Item>

          <Form.Item label="Description" name="description">
            <TextArea rows={2} placeholder="Optional description" />
          </Form.Item>

          <Form.Item
            label="Rule Type"
            name="rule_type"
            rules={[{ required: true, message: 'Please select rule type' }]}
            initialValue="threshold"
          >
            <Select>
              <Select.Option value="threshold">Threshold</Select.Option>
              <Select.Option value="anomaly">Anomaly Detection</Select.Option>
              <Select.Option value="pattern">Pattern Matching</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="Severity"
            name="severity"
            rules={[{ required: true, message: 'Please select severity' }]}
            initialValue="medium"
          >
            <Select>
              <Select.Option value="critical">Critical</Select.Option>
              <Select.Option value="high">High</Select.Option>
              <Select.Option value="medium">Medium</Select.Option>
              <Select.Option value="low">Low</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="Metric Name"
            name="metric_name"
            rules={[{ required: true, message: 'Please enter metric name' }]}
          >
            <Select>
              <Select.Option value="error_rate">Error Rate</Select.Option>
              <Select.Option value="uptime">Uptime</Select.Option>
              <Select.Option value="health_score">Health Score</Select.Option>
              <Select.Option value="session_failures">Session Failures</Select.Option>
              <Select.Option value="response_time">Response Time</Select.Option>
            </Select>
          </Form.Item>

          <Space style={{ width: '100%' }} size="large">
            <Form.Item
              label="Comparison"
              name="comparison_operator"
              rules={[{ required: true }]}
              initialValue=">"
              style={{ marginBottom: 0 }}
            >
              <Select style={{ width: 100 }}>
                <Select.Option value=">">&gt;</Select.Option>
                <Select.Option value=">=">&gt;=</Select.Option>
                <Select.Option value="<">&lt;</Select.Option>
                <Select.Option value="<=">&lt;=</Select.Option>
                <Select.Option value="=">=</Select.Option>
                <Select.Option value="!=">!=</Select.Option>
              </Select>
            </Form.Item>

            <Form.Item
              label="Threshold Value"
              name="threshold_value"
              rules={[{ required: true, message: 'Please enter threshold' }]}
              style={{ marginBottom: 0, flex: 1 }}
            >
              <InputNumber style={{ width: '100%' }} precision={2} />
            </Form.Item>
          </Space>

          <Form.Item
            label="Time Window (minutes)"
            name="time_window_minutes"
            rules={[{ required: true }]}
            initialValue={5}
          >
            <InputNumber style={{ width: '100%' }} min={1} max={1440} />
          </Form.Item>

          <Form.Item
            label={
              <Space>
                <Text>Cooldown Period (minutes)</Text>
                <Tooltip title="Minimum time between repeat alerts">
                  <InfoCircleOutlined />
                </Tooltip>
              </Space>
            }
            name="cooldown_minutes"
            initialValue={30}
          >
            <InputNumber style={{ width: '100%' }} min={0} max={1440} />
          </Form.Item>

          <Form.Item label="Notifications">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Form.Item name="notify_email" valuePropName="checked" noStyle>
                <Flex justify="space-between" align="center">
                  <Space>
                    <MailOutlined />
                    <Text>Send Email</Text>
                  </Space>
                  <Switch />
                </Flex>
              </Form.Item>

              <Form.Item name="notify_sms" valuePropName="checked" noStyle>
                <Flex justify="space-between" align="center">
                  <Space>
                    <MessageOutlined />
                    <Text>Send SMS</Text>
                  </Space>
                  <Switch />
                </Flex>
              </Form.Item>

              <Form.Item name="notify_webhook" valuePropName="checked" noStyle>
                <Flex justify="space-between" align="center">
                  <Space>
                    <LinkOutlined />
                    <Text>Webhook</Text>
                  </Space>
                  <Switch />
                </Flex>
              </Form.Item>
            </Space>
          </Form.Item>

          <Form.Item name="create_incident" valuePropName="checked">
            <Flex justify="space-between" align="center">
              <Space>
                <WarningOutlined />
                <Text>Auto-create Incident</Text>
              </Space>
              <Switch />
            </Flex>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

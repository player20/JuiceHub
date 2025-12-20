// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import React, { useState } from 'react';
import {
  Typography,
  Card,
  Table,
  Button,
  Tag,
  Space,
  Modal,
  Form,
  Input,
  message,
  Popconfirm,
  Alert,
  Tooltip,
  Select,
} from 'antd';
import {
  PlusOutlined,
  CopyOutlined,
  DeleteOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  KeyOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';

const { Title, Text, Paragraph } = Typography;
const { Option} = Select;

export const ApiKeysSettings: React.FC = () => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm] = Form.useForm();
  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  const [visibleKeys, setVisibleKeys] = useState<Set<number>>(new Set());

  // Mock API keys
  const apiKeys = [
    {
      id: 1,
      name: 'Production Server',
      key: 'sk_live_51HqJ...vZ9K',
      environment: 'production',
      lastUsed: new Date(Date.now() - 2 * 60 * 60 * 1000),
      created: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
    },
    {
      id: 2,
      name: 'Development Server',
      key: 'sk_test_51HqJ...aB2X',
      environment: 'test',
      lastUsed: new Date(Date.now() - 5 * 60 * 1000),
      created: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    },
    {
      id: 3,
      name: 'Mobile App',
      key: 'sk_live_51HqJ...cD4Y',
      environment: 'production',
      lastUsed: null,
      created: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    },
  ];

  const handleCreateKey = async (values: any) => {
    try {
      // TODO: API call to create key
      const mockKey = 'sk_' + values.environment + '_51HqJ' + Math.random().toString(36).substring(2, 15);
      setNewApiKey(mockKey);
      message.success('API key created successfully');
      createForm.resetFields();
    } catch (error) {
      message.error('Failed to create API key');
    }
  };

  const handleDeleteKey = (keyId: number) => {
    message.success('API key deleted successfully');
  };

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    message.success('API key copied to clipboard');
  };

  const toggleKeyVisibility = (keyId: number) => {
    const newVisible = new Set(visibleKeys);
    if (newVisible.has(keyId)) {
      newVisible.delete(keyId);
    } else {
      newVisible.add(keyId);
    }
    setVisibleKeys(newVisible);
  };

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: 'API Key',
      dataIndex: 'key',
      key: 'key',
      render: (key: string, record: any) => (
        <Space>
          <Text code>
            {visibleKeys.has(record.id) ? key : key.slice(0, 20) + '...' + key.slice(-4)}
          </Text>
          <Tooltip title={visibleKeys.has(record.id) ? 'Hide' : 'Show'}>
            <Button
              type="text"
              size="small"
              icon={visibleKeys.has(record.id) ? <EyeInvisibleOutlined /> : <EyeOutlined />}
              onClick={() => toggleKeyVisibility(record.id)}
            />
          </Tooltip>
          <Tooltip title="Copy">
            <Button
              type="text"
              size="small"
              icon={<CopyOutlined />}
              onClick={() => handleCopyKey(key)}
            />
          </Tooltip>
        </Space>
      ),
    },
    {
      title: 'Environment',
      dataIndex: 'environment',
      key: 'environment',
      render: (env: string) =>
        env === 'production' ? (
          <Tag color="error">Production</Tag>
        ) : (
          <Tag color="warning">Test</Tag>
        ),
    },
    {
      title: 'Last Used',
      dataIndex: 'lastUsed',
      key: 'lastUsed',
      render: (date: Date | null) =>
        date ? dayjs(date).fromNow() : <Text type="secondary">Never</Text>,
    },
    {
      title: 'Created',
      dataIndex: 'created',
      key: 'created',
      render: (date: Date) => dayjs(date).format('MMM DD, YYYY'),
    },
    {
      title: 'Action',
      key: 'action',
      render: (_: any, record: any) => (
        <Popconfirm
          title="Delete API key"
          description="This action cannot be undone. Any applications using this key will stop working."
          onConfirm={() => handleDeleteKey(record.id)}
          okText="Delete"
          cancelText="Cancel"
          okButtonProps={{ danger: true }}
        >
          <Button type="link" danger icon={<DeleteOutlined />}>
            Delete
          </Button>
        </Popconfirm>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
        <div>
          <Title level={3}>API Keys</Title>
          <Text type="secondary">
            Manage API keys for programmatic access to your account
          </Text>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setShowCreateModal(true)}
        >
          Create API Key
        </Button>
      </div>

      <Alert
        message="Keep your API keys secure"
        description="Treat your API keys like passwords. Never share them publicly or commit them to version control."
        type="warning"
        showIcon
        style={{ marginTop: 24, marginBottom: 24 }}
      />

      <Card>
        <Table
          columns={columns}
          dataSource={apiKeys}
          rowKey="id"
          pagination={false}
        />
      </Card>

      {/* API Documentation Link */}
      <Card title="API Documentation" style={{ marginTop: 24 }}>
        <Paragraph>
          Learn how to use our API to integrate with your applications.
        </Paragraph>
        <Space>
          <Button type="primary">View API Documentation</Button>
          <Button>Download Postman Collection</Button>
        </Space>
      </Card>

      {/* Create API Key Modal */}
      <Modal
        title="Create API Key"
        open={showCreateModal}
        onCancel={() => {
          setShowCreateModal(false);
          setNewApiKey(null);
          createForm.resetFields();
        }}
        footer={
          newApiKey ? (
            <Button type="primary" onClick={() => {
              setShowCreateModal(false);
              setNewApiKey(null);
            }}>
              Done
            </Button>
          ) : null
        }
        width={600}
      >
        {!newApiKey ? (
          <Form form={createForm} layout="vertical" onFinish={handleCreateKey}>
            <Form.Item
              label="Key Name"
              name="name"
              rules={[{ required: true, message: 'Please enter a name for this API key' }]}
            >
              <Input
                size="large"
                placeholder="e.g., Production Server, Mobile App"
              />
            </Form.Item>

            <Form.Item
              label="Environment"
              name="environment"
              initialValue="test"
              rules={[{ required: true, message: 'Please select an environment' }]}
            >
              <Select size="large">
                <Option value="test">Test</Option>
                <Option value="production">Production</Option>
              </Select>
            </Form.Item>

            <Form.Item>
              <Button type="primary" htmlType="submit" block size="large" icon={<KeyOutlined />}>
                Generate API Key
              </Button>
            </Form.Item>
          </Form>
        ) : (
          <div>
            <Alert
              message="Save Your API Key"
              description="Copy and store this API key in a secure location. For security reasons, you won't be able to see it again."
              type="success"
              showIcon
              style={{ marginBottom: 16 }}
            />

            <div style={{ background: '#f5f5f5', padding: 16, borderRadius: 8 }}>
              <Text strong>API Key:</Text>
              <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Input.TextArea
                  value={newApiKey}
                  readOnly
                  autoSize
                  style={{ fontFamily: 'monospace' }}
                />
                <Button
                  icon={<CopyOutlined />}
                  onClick={() => handleCopyKey(newApiKey)}
                >
                  Copy
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

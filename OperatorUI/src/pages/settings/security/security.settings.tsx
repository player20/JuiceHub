// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import React, { useState } from 'react';
import {
  Typography,
  Form,
  Input,
  Button,
  Card,
  Space,
  Divider,
  message,
  Switch,
  Table,
  Tag,
  Modal,
  Alert,
  QRCode,
} from 'antd';
import {
  LockOutlined,
  SaveOutlined,
  MobileOutlined,
  DesktopOutlined,
  CloseCircleOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';

const { Title, Text, Paragraph } = Typography;

export const SecuritySettings: React.FC = () => {
  const [passwordForm] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [showTwoFactorSetup, setShowTwoFactorSetup] = useState(false);

  // Mock active sessions data
  const activeSessions = [
    {
      id: 1,
      device: 'Chrome on macOS',
      location: 'San Francisco, CA',
      ipAddress: '192.168.1.100',
      lastActive: new Date(),
      current: true,
    },
    {
      id: 2,
      device: 'Safari on iPhone',
      location: 'San Francisco, CA',
      ipAddress: '192.168.1.101',
      lastActive: new Date(Date.now() - 3600000),
      current: false,
    },
  ];

  const handlePasswordChange = async (values: any) => {
    setLoading(true);
    try {
      // TODO: Implement API call
      console.log('Password change:', values);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      message.success('Password updated successfully');
      passwordForm.resetFields();
    } catch (error) {
      message.error('Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleTwoFactor = (enabled: boolean) => {
    if (enabled) {
      setShowTwoFactorSetup(true);
    } else {
      Modal.confirm({
        title: 'Disable Two-Factor Authentication',
        content: 'Are you sure you want to disable two-factor authentication? This will make your account less secure.',
        onOk: () => {
          setTwoFactorEnabled(false);
          message.success('Two-factor authentication disabled');
        },
      });
    }
  };

  const handleCompleteTwoFactorSetup = () => {
    setTwoFactorEnabled(true);
    setShowTwoFactorSetup(false);
    message.success('Two-factor authentication enabled successfully');
  };

  const handleRevokeSession = (sessionId: number) => {
    Modal.confirm({
      title: 'Revoke Session',
      content: 'Are you sure you want to revoke this session? The user will be logged out immediately.',
      onOk: () => {
        message.success('Session revoked successfully');
      },
    });
  };

  const sessionColumns = [
    {
      title: 'Device',
      dataIndex: 'device',
      key: 'device',
      render: (text: string, record: any) => (
        <Space>
          {text.includes('iPhone') || text.includes('Android') ? (
            <MobileOutlined />
          ) : (
            <DesktopOutlined />
          )}
          <div>
            <div><Text strong>{text}</Text></div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {record.ipAddress} • {record.location}
            </Text>
          </div>
        </Space>
      ),
    },
    {
      title: 'Last Active',
      dataIndex: 'lastActive',
      key: 'lastActive',
      render: (date: Date) => dayjs(date).fromNow(),
    },
    {
      title: 'Status',
      key: 'status',
      render: (_: any, record: any) =>
        record.current ? (
          <Tag color="green" icon={<CheckCircleOutlined />}>
            Current Session
          </Tag>
        ) : (
          <Tag>Active</Tag>
        ),
    },
    {
      title: 'Action',
      key: 'action',
      render: (_: any, record: any) =>
        !record.current && (
          <Button
            type="link"
            danger
            icon={<CloseCircleOutlined />}
            onClick={() => handleRevokeSession(record.id)}
          >
            Revoke
          </Button>
        ),
    },
  ];

  return (
    <div>
      <Title level={3}>Security Settings</Title>
      <Text type="secondary">
        Manage your account security and authentication methods
      </Text>

      <Divider />

      {/* Change Password */}
      <Card title="Change Password" style={{ marginBottom: 24 }}>
        <Form
          form={passwordForm}
          layout="vertical"
          onFinish={handlePasswordChange}
          style={{ maxWidth: 500 }}
        >
          <Form.Item
            label="Current Password"
            name="currentPassword"
            rules={[{ required: true, message: 'Please enter your current password' }]}
          >
            <Input.Password size="large" placeholder="Enter current password" />
          </Form.Item>

          <Form.Item
            label="New Password"
            name="newPassword"
            rules={[
              { required: true, message: 'Please enter a new password' },
              { min: 8, message: 'Password must be at least 8 characters' },
            ]}
          >
            <Input.Password size="large" placeholder="Enter new password" />
          </Form.Item>

          <Form.Item
            label="Confirm New Password"
            name="confirmPassword"
            dependencies={['newPassword']}
            rules={[
              { required: true, message: 'Please confirm your new password' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('Passwords do not match'));
                },
              }),
            ]}
          >
            <Input.Password size="large" placeholder="Confirm new password" />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              icon={<SaveOutlined />}
              loading={loading}
              size="large"
            >
              Update Password
            </Button>
          </Form.Item>
        </Form>
      </Card>

      {/* Two-Factor Authentication */}
      <Card
        title="Two-Factor Authentication"
        extra={
          <Switch
            checked={twoFactorEnabled}
            onChange={handleToggleTwoFactor}
            checkedChildren="Enabled"
            unCheckedChildren="Disabled"
          />
        }
        style={{ marginBottom: 24 }}
      >
        <Paragraph>
          Add an extra layer of security to your account. When enabled, you'll need to enter a code from your
          authenticator app in addition to your password when signing in.
        </Paragraph>

        {twoFactorEnabled && (
          <Alert
            message="Two-Factor Authentication is Active"
            description="Your account is protected with two-factor authentication."
            type="success"
            showIcon
          />
        )}
      </Card>

      {/* Active Sessions */}
      <Card title="Active Sessions">
        <Paragraph type="secondary">
          Manage your active sessions across all devices. You can revoke access to any device at any time.
        </Paragraph>

        <Table
          columns={sessionColumns}
          dataSource={activeSessions}
          rowKey="id"
          pagination={false}
        />
      </Card>

      {/* Two-Factor Setup Modal */}
      <Modal
        title="Enable Two-Factor Authentication"
        open={showTwoFactorSetup}
        onOk={handleCompleteTwoFactorSetup}
        onCancel={() => setShowTwoFactorSetup(false)}
        okText="Enable 2FA"
        width={600}
      >
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div>
            <Title level={5}>1. Install an Authenticator App</Title>
            <Paragraph>
              Download and install an authenticator app on your mobile device:
            </Paragraph>
            <ul>
              <li>Google Authenticator</li>
              <li>Microsoft Authenticator</li>
              <li>Authy</li>
            </ul>
          </div>

          <div>
            <Title level={5}>2. Scan QR Code</Title>
            <Paragraph>
              Scan this QR code with your authenticator app:
            </Paragraph>
            <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
              <QRCode value="otpauth://totp/CitrineOS:user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=CitrineOS" />
            </div>
            <Text type="secondary">
              Manual entry key: JBSWY-3DPEH-PK3PX-P
            </Text>
          </div>

          <div>
            <Title level={5}>3. Enter Verification Code</Title>
            <Input
              size="large"
              placeholder="Enter 6-digit code"
              maxLength={6}
              style={{ width: 200 }}
            />
          </div>
        </Space>
      </Modal>
    </div>
  );
};

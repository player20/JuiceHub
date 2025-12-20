// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import React, { useState } from 'react';
import {
  Typography,
  Card,
  Form,
  Switch,
  Button,
  Space,
  Divider,
  message,
  Select,
  Input,
  Row,
  Col,
} from 'antd';
import {
  BellOutlined,
  MailOutlined,
  MobileOutlined,
  SaveOutlined,
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

export const NotificationSettings: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (values: any) => {
    setLoading(true);
    try {
      // TODO: API call to update notification preferences
      console.log('Notification preferences:', values);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      message.success('Notification preferences updated');
    } catch (error) {
      message.error('Failed to update preferences');
    } finally {
      setLoading(false);
    }
  };

  const notificationTypes = [
    {
      key: 'alerts',
      title: 'System Alerts',
      description: 'Critical alerts about system health and charging station status',
    },
    {
      key: 'transactions',
      title: 'Transaction Notifications',
      description: 'Updates about charging sessions and payments',
    },
    {
      key: 'maintenance',
      title: 'Maintenance Reminders',
      description: 'Scheduled maintenance and service notifications',
    },
    {
      key: 'billing',
      title: 'Billing & Invoices',
      description: 'Billing updates, invoice reminders, and payment confirmations',
    },
    {
      key: 'security',
      title: 'Security Alerts',
      description: 'Login attempts, password changes, and security events',
    },
    {
      key: 'updates',
      title: 'Product Updates',
      description: 'New features, updates, and platform announcements',
    },
    {
      key: 'reports',
      title: 'Weekly Reports',
      description: 'Summary reports of your network performance and usage',
    },
  ];

  return (
    <div>
      <Title level={3}>Notification Settings</Title>
      <Text type="secondary">
        Control how and when you receive notifications
      </Text>

      <Divider />

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          // Email notifications
          'email_alerts': true,
          'email_transactions': true,
          'email_maintenance': true,
          'email_billing': true,
          'email_security': true,
          'email_updates': false,
          'email_reports': true,
          // SMS notifications
          'sms_alerts': true,
          'sms_transactions': false,
          'sms_maintenance': false,
          'sms_billing': false,
          'sms_security': true,
          'sms_updates': false,
          'sms_reports': false,
          // Push notifications
          'push_alerts': true,
          'push_transactions': true,
          'push_maintenance': false,
          'push_billing': false,
          'push_security': true,
          'push_updates': false,
          'push_reports': false,
          // Preferences
          emailFrequency: 'instant',
          digestTime: '09:00',
        }}
      >
        {/* Notification Channels */}
        <Card title="Notification Channels" style={{ marginBottom: 24 }}>
          <Row gutter={[16, 16]}>
            <Col span={24}>
              <div style={{ marginBottom: 16 }}>
                <MailOutlined style={{ marginRight: 8 }} />
                <Text strong>Email Notifications</Text>
              </div>
              <Form.Item label="Email Address">
                <Input defaultValue="john.doe@example.com" disabled />
              </Form.Item>
              <Form.Item label="Frequency" name="emailFrequency">
                <Select>
                  <Option value="instant">Instant (as they happen)</Option>
                  <Option value="hourly">Hourly Digest</Option>
                  <Option value="daily">Daily Digest</Option>
                </Select>
              </Form.Item>
            </Col>

            <Col span={24}>
              <Divider />
              <div style={{ marginBottom: 16 }}>
                <MobileOutlined style={{ marginRight: 8 }} />
                <Text strong>SMS Notifications</Text>
              </div>
              <Form.Item label="Phone Number">
                <Input placeholder="+1 (555) 123-4567" />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* Notification Types */}
        <Card title="Notification Types">
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <th style={{ textAlign: 'left', padding: '12px 8px' }}>Type</th>
                  <th style={{ textAlign: 'center', padding: '12px 8px' }}>
                    <MailOutlined /> Email
                  </th>
                  <th style={{ textAlign: 'center', padding: '12px 8px' }}>
                    <MobileOutlined /> SMS
                  </th>
                  <th style={{ textAlign: 'center', padding: '12px 8px' }}>
                    <BellOutlined /> Push
                  </th>
                </tr>
              </thead>
              <tbody>
                {notificationTypes.map((type) => (
                  <tr
                    key={type.key}
                    style={{ borderBottom: '1px solid #f0f0f0' }}
                  >
                    <td style={{ padding: '16px 8px' }}>
                      <div>
                        <Text strong>{type.title}</Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {type.description}
                        </Text>
                      </div>
                    </td>
                    <td style={{ textAlign: 'center', padding: '16px 8px' }}>
                      <Form.Item
                        name={`email_${type.key}`}
                        valuePropName="checked"
                        style={{ margin: 0 }}
                      >
                        <Switch />
                      </Form.Item>
                    </td>
                    <td style={{ textAlign: 'center', padding: '16px 8px' }}>
                      <Form.Item
                        name={`sms_${type.key}`}
                        valuePropName="checked"
                        style={{ margin: 0 }}
                      >
                        <Switch />
                      </Form.Item>
                    </td>
                    <td style={{ textAlign: 'center', padding: '16px 8px' }}>
                      <Form.Item
                        name={`push_${type.key}`}
                        valuePropName="checked"
                        style={{ margin: 0 }}
                      >
                        <Switch />
                      </Form.Item>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Divider />

        {/* Actions */}
        <Form.Item>
          <Space>
            <Button
              type="primary"
              htmlType="submit"
              icon={<SaveOutlined />}
              loading={loading}
              size="large"
            >
              Save Preferences
            </Button>
            <Button size="large" onClick={() => form.resetFields()}>
              Reset to Defaults
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </div>
  );
};

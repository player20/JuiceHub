// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import React, { useState } from 'react';
import {
  Typography,
  Form,
  Card,
  Select,
  Switch,
  Button,
  Space,
  Divider,
  message,
  Radio,
  InputNumber,
} from 'antd';
import {
  SaveOutlined,
  GlobalOutlined,
  ClockCircleOutlined,
  BgColorsOutlined,
} from '@ant-design/icons';

const { Title, Text } = Typography;
const { Option } = Select;

export const PreferencesSettings: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (values: any) => {
    setLoading(true);
    try {
      // TODO: API call to update preferences
      console.log('Preferences:', values);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      message.success('Preferences updated successfully');
    } catch (error) {
      message.error('Failed to update preferences');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Title level={3}>Preferences</Title>
      <Text type="secondary">
        Customize your experience and regional settings
      </Text>

      <Divider />

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          language: 'en-US',
          timezone: 'America/Los_Angeles',
          dateFormat: 'MM/DD/YYYY',
          timeFormat: '12h',
          currency: 'USD',
          units: 'imperial',
          theme: 'system',
          compactMode: false,
          showTutorials: true,
          autoSave: true,
          sessionTimeout: 30,
        }}
        style={{ maxWidth: 600 }}
      >
        {/* Regional Settings */}
        <Card title={<><GlobalOutlined /> Regional Settings</>} style={{ marginBottom: 24 }}>
          <Form.Item
            label="Language"
            name="language"
            rules={[{ required: true }]}
          >
            <Select size="large">
              <Option value="en-US">English (US)</Option>
              <Option value="en-GB">English (UK)</Option>
              <Option value="es">Español</Option>
              <Option value="fr">Français</Option>
              <Option value="de">Deutsch</Option>
              <Option value="pt-BR">Português (Brasil)</Option>
              <Option value="zh-CN">中文 (简体)</Option>
              <Option value="ja">日本語</Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="Timezone"
            name="timezone"
            rules={[{ required: true }]}
          >
            <Select size="large" showSearch>
              <Option value="America/Los_Angeles">Pacific Time (PT)</Option>
              <Option value="America/Denver">Mountain Time (MT)</Option>
              <Option value="America/Chicago">Central Time (CT)</Option>
              <Option value="America/New_York">Eastern Time (ET)</Option>
              <Option value="Europe/London">London (GMT)</Option>
              <Option value="Europe/Paris">Paris (CET)</Option>
              <Option value="Asia/Tokyo">Tokyo (JST)</Option>
              <Option value="Asia/Shanghai">Shanghai (CST)</Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="Currency"
            name="currency"
            rules={[{ required: true }]}
          >
            <Select size="large">
              <Option value="USD">USD ($)</Option>
              <Option value="EUR">EUR (€)</Option>
              <Option value="GBP">GBP (£)</Option>
              <Option value="JPY">JPY (¥)</Option>
              <Option value="CNY">CNY (¥)</Option>
              <Option value="BRL">BRL (R$)</Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="Units"
            name="units"
            rules={[{ required: true }]}
          >
            <Radio.Group size="large">
              <Radio value="metric">Metric (km, kg, °C)</Radio>
              <Radio value="imperial">Imperial (mi, lb, °F)</Radio>
            </Radio.Group>
          </Form.Item>
        </Card>

        {/* Date & Time Settings */}
        <Card title={<><ClockCircleOutlined /> Date & Time</>} style={{ marginBottom: 24 }}>
          <Form.Item
            label="Date Format"
            name="dateFormat"
            rules={[{ required: true }]}
          >
            <Select size="large">
              <Option value="MM/DD/YYYY">MM/DD/YYYY (12/31/2024)</Option>
              <Option value="DD/MM/YYYY">DD/MM/YYYY (31/12/2024)</Option>
              <Option value="YYYY-MM-DD">YYYY-MM-DD (2024-12-31)</Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="Time Format"
            name="timeFormat"
            rules={[{ required: true }]}
          >
            <Radio.Group size="large">
              <Radio value="12h">12-hour (3:00 PM)</Radio>
              <Radio value="24h">24-hour (15:00)</Radio>
            </Radio.Group>
          </Form.Item>
        </Card>

        {/* Appearance */}
        <Card title={<><BgColorsOutlined /> Appearance</>} style={{ marginBottom: 24 }}>
          <Form.Item
            label="Theme"
            name="theme"
            rules={[{ required: true }]}
          >
            <Radio.Group size="large">
              <Radio value="light">Light</Radio>
              <Radio value="dark">Dark</Radio>
              <Radio value="system">System Default</Radio>
            </Radio.Group>
          </Form.Item>

          <Form.Item
            label="Compact Mode"
            name="compactMode"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
          <Text type="secondary">
            Reduces spacing and shows more content on screen
          </Text>
        </Card>

        {/* Behavior Settings */}
        <Card title="Behavior" style={{ marginBottom: 24 }}>
          <Form.Item
            label="Show Tutorials"
            name="showTutorials"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
          <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
            Display helpful tips and tutorials for new features
          </Text>

          <Form.Item
            label="Auto-Save"
            name="autoSave"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
          <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
            Automatically save form changes
          </Text>

          <Form.Item
            label="Session Timeout (minutes)"
            name="sessionTimeout"
            rules={[{ required: true }]}
          >
            <InputNumber min={5} max={120} size="large" style={{ width: '100%' }} />
          </Form.Item>
          <Text type="secondary">
            Auto-logout after period of inactivity
          </Text>
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

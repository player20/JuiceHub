// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import React, { useState } from 'react';
import {
  Typography,
  Form,
  Input,
  Button,
  Upload,
  Avatar,
  Space,
  Divider,
  message,
  Row,
  Col,
} from 'antd';
import { UserOutlined, UploadOutlined, SaveOutlined } from '@ant-design/icons';
import type { UploadProps } from 'antd';

const { Title, Text } = Typography;

export const ProfileSettings: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string>('');

  const handleSubmit = async (values: any) => {
    setLoading(true);
    try {
      // TODO: Implement API call to update profile
      console.log('Profile update:', values);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      message.success('Profile updated successfully');
    } catch (error) {
      message.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const uploadProps: UploadProps = {
    name: 'avatar',
    listType: 'picture',
    showUploadList: false,
    beforeUpload: (file) => {
      const isImage = file.type.startsWith('image/');
      if (!isImage) {
        message.error('You can only upload image files!');
        return false;
      }
      const isLt2M = file.size / 1024 / 1024 < 2;
      if (!isLt2M) {
        message.error('Image must be smaller than 2MB!');
        return false;
      }

      // Create preview URL
      const reader = new FileReader();
      reader.onload = (e) => {
        setAvatarUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      return false; // Prevent auto upload
    },
  };

  return (
    <div>
      <Title level={3}>Profile Settings</Title>
      <Text type="secondary">
        Manage your personal information and profile picture
      </Text>

      <Divider />

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com',
          phone: '+1 (555) 123-4567',
          company: 'Acme Corporation',
          jobTitle: 'Fleet Manager',
        }}
        style={{ maxWidth: 600 }}
      >
        {/* Avatar Upload */}
        <Form.Item label="Profile Picture">
          <Space align="start">
            <Avatar
              size={80}
              icon={<UserOutlined />}
              src={avatarUrl}
              style={{ backgroundColor: '#1890ff' }}
            />
            <Upload {...uploadProps}>
              <Button icon={<UploadOutlined />}>Change Picture</Button>
            </Upload>
          </Space>
          <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
            Recommended: Square image, at least 400x400px, max 2MB
          </Text>
        </Form.Item>

        <Divider />

        {/* Personal Information */}
        <Title level={5}>Personal Information</Title>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="First Name"
              name="firstName"
              rules={[{ required: true, message: 'Please enter your first name' }]}
            >
              <Input size="large" placeholder="John" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="Last Name"
              name="lastName"
              rules={[{ required: true, message: 'Please enter your last name' }]}
            >
              <Input size="large" placeholder="Doe" />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          label="Email Address"
          name="email"
          rules={[
            { required: true, message: 'Please enter your email' },
            { type: 'email', message: 'Please enter a valid email' },
          ]}
        >
          <Input size="large" placeholder="john.doe@example.com" />
        </Form.Item>

        <Form.Item
          label="Phone Number"
          name="phone"
        >
          <Input size="large" placeholder="+1 (555) 123-4567" />
        </Form.Item>

        <Divider />

        {/* Organization Information */}
        <Title level={5}>Organization</Title>

        <Form.Item label="Company Name" name="company">
          <Input size="large" placeholder="Acme Corporation" />
        </Form.Item>

        <Form.Item label="Job Title" name="jobTitle">
          <Input size="large" placeholder="Fleet Manager" />
        </Form.Item>

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
              Save Changes
            </Button>
            <Button size="large" onClick={() => form.resetFields()}>
              Cancel
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </div>
  );
};

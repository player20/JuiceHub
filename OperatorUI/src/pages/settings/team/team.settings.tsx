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
  Avatar,
  Modal,
  Form,
  Input,
  Select,
  message,
  Popconfirm,
} from 'antd';
import {
  UserOutlined,
  PlusOutlined,
  MailOutlined,
  DeleteOutlined,
  CrownOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;

export const TeamSettings: React.FC = () => {
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteForm] = Form.useForm();

  // Mock team members
  const teamMembers = [
    {
      id: 1,
      name: 'John Doe',
      email: 'john.doe@example.com',
      role: 'owner',
      status: 'active',
      joinedAt: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
      lastActive: new Date(),
    },
    {
      id: 2,
      name: 'Jane Smith',
      email: 'jane.smith@example.com',
      role: 'admin',
      status: 'active',
      joinedAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
      lastActive: new Date(Date.now() - 2 * 60 * 60 * 1000),
    },
    {
      id: 3,
      name: 'Bob Johnson',
      email: 'bob.johnson@example.com',
      role: 'member',
      status: 'active',
      joinedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      lastActive: new Date(Date.now() - 24 * 60 * 60 * 1000),
    },
    {
      id: 4,
      name: 'Alice Williams',
      email: 'alice.williams@example.com',
      role: 'member',
      status: 'invited',
      joinedAt: null,
      lastActive: null,
    },
  ];

  const handleInvite = async (values: any) => {
    try {
      // TODO: API call to invite user
      console.log('Inviting user:', values);
      message.success(`Invitation sent to ${values.email}`);
      setShowInviteModal(false);
      inviteForm.resetFields();
    } catch (error) {
      message.error('Failed to send invitation');
    }
  };

  const handleRemoveMember = (memberId: number) => {
    message.success('Team member removed successfully');
  };

  const handleUpdateRole = (memberId: number, newRole: string) => {
    message.success('Role updated successfully');
  };

  const columns = [
    {
      title: 'Member',
      key: 'member',
      render: (_: any, record: any) => (
        <Space>
          <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#1890ff' }} />
          <div>
            <div>
              <Text strong>{record.name}</Text>
              {record.role === 'owner' && (
                <CrownOutlined style={{ marginLeft: 8, color: '#faad14' }} />
              )}
            </div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {record.email}
            </Text>
          </div>
        </Space>
      ),
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      render: (role: string, record: any) => (
        <Select
          value={role}
          style={{ width: 120 }}
          disabled={record.role === 'owner'}
          onChange={(value) => handleUpdateRole(record.id, value)}
        >
          <Option value="owner">Owner</Option>
          <Option value="admin">Admin</Option>
          <Option value="member">Member</Option>
          <Option value="viewer">Viewer</Option>
        </Select>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) =>
        status === 'active' ? (
          <Tag color="success">Active</Tag>
        ) : (
          <Tag color="warning">Invited</Tag>
        ),
    },
    {
      title: 'Joined',
      dataIndex: 'joinedAt',
      key: 'joinedAt',
      render: (date: Date | null) =>
        date ? dayjs(date).format('MMM DD, YYYY') : '-',
    },
    {
      title: 'Last Active',
      dataIndex: 'lastActive',
      key: 'lastActive',
      render: (date: Date | null) =>
        date ? dayjs(date).fromNow() : '-',
    },
    {
      title: 'Action',
      key: 'action',
      render: (_: any, record: any) =>
        record.role !== 'owner' && (
          <Popconfirm
            title="Remove team member"
            description="Are you sure you want to remove this team member?"
            onConfirm={() => handleRemoveMember(record.id)}
            okText="Remove"
            cancelText="Cancel"
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              Remove
            </Button>
          </Popconfirm>
        ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
        <div>
          <Title level={3}>Team Management</Title>
          <Text type="secondary">
            Manage your team members and their permissions
          </Text>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setShowInviteModal(true)}
        >
          Invite Team Member
        </Button>
      </div>

      <Card style={{ marginTop: 24 }}>
        <Table
          columns={columns}
          dataSource={teamMembers}
          rowKey="id"
          pagination={false}
        />
      </Card>

      {/* Role Permissions Info */}
      <Card title="Role Permissions" style={{ marginTop: 24 }}>
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <div>
            <Text strong>Owner</Text>
            <br />
            <Text type="secondary">
              Full access to all features including billing, team management, and account deletion.
            </Text>
          </div>
          <div>
            <Text strong>Admin</Text>
            <br />
            <Text type="secondary">
              Can manage stations, transactions, and team members. Cannot modify billing or delete account.
            </Text>
          </div>
          <div>
            <Text strong>Member</Text>
            <br />
            <Text type="secondary">
              Can view and manage charging stations and transactions. Cannot manage team or billing.
            </Text>
          </div>
          <div>
            <Text strong>Viewer</Text>
            <br />
            <Text type="secondary">
              Read-only access to dashboards and reports. Cannot make any changes.
            </Text>
          </div>
        </Space>
      </Card>

      {/* Invite Modal */}
      <Modal
        title="Invite Team Member"
        open={showInviteModal}
        onCancel={() => {
          setShowInviteModal(false);
          inviteForm.resetFields();
        }}
        onOk={() => inviteForm.submit()}
        okText="Send Invitation"
      >
        <Form form={inviteForm} layout="vertical" onFinish={handleInvite}>
          <Form.Item
            label="Email Address"
            name="email"
            rules={[
              { required: true, message: 'Please enter an email address' },
              { type: 'email', message: 'Please enter a valid email' },
            ]}
          >
            <Input
              size="large"
              prefix={<MailOutlined />}
              placeholder="colleague@example.com"
            />
          </Form.Item>

          <Form.Item
            label="Role"
            name="role"
            initialValue="member"
            rules={[{ required: true, message: 'Please select a role' }]}
          >
            <Select size="large">
              <Option value="admin">Admin</Option>
              <Option value="member">Member</Option>
              <Option value="viewer">Viewer</Option>
            </Select>
          </Form.Item>

          <Form.Item label="Personal Message (Optional)" name="message">
            <Input.TextArea
              rows={3}
              placeholder="Add a personal message to the invitation email..."
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

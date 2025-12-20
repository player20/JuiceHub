// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import React, { useContext } from 'react';
import { Layout, Menu, Card, Typography, Button, Flex, Avatar, Dropdown } from 'antd';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  UserOutlined,
  LockOutlined,
  CreditCardOutlined,
  TeamOutlined,
  BellOutlined,
  ApiOutlined,
  DashboardOutlined,
  SettingOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import { ColorModeContext } from '../../../contexts/color-mode';
import './settings.layout.scss';

const { Sider, Content, Header } = Layout;
const { Title } = Typography;

export const SettingsLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { mode } = useContext(ColorModeContext);

  const menuItems = [
    {
      key: '/settings/profile',
      icon: <UserOutlined />,
      label: 'Profile',
    },
    {
      key: '/settings/security',
      icon: <LockOutlined />,
      label: 'Security',
    },
    {
      key: '/settings/billing',
      icon: <CreditCardOutlined />,
      label: 'Billing & Subscription',
    },
    {
      key: '/settings/team',
      icon: <TeamOutlined />,
      label: 'Team',
    },
    {
      key: '/settings/notifications',
      icon: <BellOutlined />,
      label: 'Notifications',
    },
    {
      key: '/settings/api-keys',
      icon: <ApiOutlined />,
      label: 'API Keys',
    },
    {
      key: '/settings/usage',
      icon: <DashboardOutlined />,
      label: 'Usage & Quotas',
    },
    {
      key: '/settings/preferences',
      icon: <SettingOutlined />,
      label: 'Preferences',
    },
  ];

  const profileMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: 'My Profile',
      onClick: () => navigate('/settings/profile'),
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: 'Settings',
      onClick: () => navigate('/settings'),
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Logout',
      danger: true,
      onClick: () => {
        // TODO: Implement logout
        console.log('Logout clicked');
      },
    },
  ];

  const currentPath = location.pathname === '/settings' ? '/settings/profile' : location.pathname;

  return (
    <div className="settings-layout">
      {/* JuiceNet Green Gradient Background */}
      <div className={`settings-gradient ${mode === 'dark' ? 'dark' : ''}`} />

      {/* Header with JuiceHub Title and Actions */}
      <Header className="settings-header">
        <Flex justify="space-between" align="center" style={{ height: '100%' }}>
          <Title level={2} style={{ margin: 0, color: mode === 'dark' ? '#fff' : '#131211' }}>
            JuiceHub
          </Title>

          <Flex gap={12} align="center">
            <Button
              type="text"
              icon={<SettingOutlined style={{ fontSize: 18 }} />}
              onClick={() => navigate('/settings')}
              style={{ color: mode === 'dark' ? '#fff' : '#131211' }}
            />
            <Dropdown menu={{ items: profileMenuItems }} placement="bottomRight">
              <Avatar
                icon={<UserOutlined />}
                style={{
                  backgroundColor: '#3db014',
                  cursor: 'pointer',
                }}
              />
            </Dropdown>
          </Flex>
        </Flex>
      </Header>

      {/* Main Settings Content */}
      <div style={{ padding: '24px 24px 0' }}>
        <div style={{ marginBottom: 24 }}>
          <Title level={3} style={{ margin: 0 }}>
            Account Settings
          </Title>
        </div>

        <Layout style={{ background: 'transparent' }}>
          <Sider
            width={250}
            style={{
              background: mode === 'dark' ? '#1f1f1f' : 'white',
              borderRadius: 8,
              marginRight: 24,
              overflow: 'hidden',
            }}
          >
            <Menu
              mode="inline"
              selectedKeys={[currentPath]}
              items={menuItems}
              onClick={({ key }) => navigate(key)}
              style={{ border: 'none' }}
            />
          </Sider>

          <Content>
            <Card bordered={false}>
              <Outlet />
            </Card>
          </Content>
        </Layout>
      </div>
    </div>
  );
};

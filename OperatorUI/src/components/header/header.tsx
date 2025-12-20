// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import { Flex, Layout as AntdLayout, Menu, theme, Typography, Button, Avatar, Dropdown } from 'antd';
import React, { useContext, useMemo } from 'react';
import { ColorModeContext } from '../../contexts/color-mode';
import './style.scss';
import { SearchIcon } from '../icons/search.icon';
import { AvatarIcon } from '../icons/avatar.icon';
import { useNavigate } from 'react-router-dom';
import { MenuSection } from '../main-menu/main.menu';
import { DarkModeSwitch } from './dark-mode-switch/dark.mode.switch';
import {
  OverviewHelp,
  ChargingStationsHelp,
  LocationsHelp,
  AuthorizationsHelp,
  TransactionsHelp,
  PartnersHelp,
  ErrorLogsHelp,
} from '../help-tooltip';
import { UserOutlined, SettingOutlined, LogoutOutlined } from '@ant-design/icons';

const { useToken } = theme;
const { Title } = Typography;

export interface HeaderProps {
  activeSection: MenuSection;
}

export const Header: React.FC<HeaderProps> = ({
  activeSection,
}: HeaderProps) => {
  const { token } = useToken();
  const { mode, setMode } = useContext(ColorModeContext);
  const navigate = useNavigate();

  const menuItems = useMemo(() => {
    switch (activeSection) {
      case MenuSection.LOCATIONS:
        return [
          { key: `/${MenuSection.LOCATIONS}`, label: 'Locations' },
          // { key: `/${MenuSection.LOCATIONS}/map`, label: 'Map View' },
        ];
      case MenuSection.CHARGING_STATIONS:
        return [
          {
            key: `/${MenuSection.CHARGING_STATIONS}`,
            label: 'Charging Stations',
          },
        ];
      case MenuSection.AUTHORIZATIONS:
        return [
          { key: `/${MenuSection.AUTHORIZATIONS}`, label: 'Authorizations' },
        ];
      case MenuSection.TRANSACTIONS:
        return [{ key: `/${MenuSection.TRANSACTIONS}`, label: 'Transactions' }];
      case MenuSection.PARTNERS:
        return [{ key: `/${MenuSection.PARTNERS}`, label: 'Partners' }];
      case MenuSection.ERROR_LOGS:
        return [{ key: `/${MenuSection.ERROR_LOGS}`, label: 'Error Logs' }];
      case MenuSection.ANALYTICS:
        return [{ key: `/${MenuSection.ANALYTICS}`, label: 'Analytics' }];
      case MenuSection.REVENUE:
        return [{ key: `/${MenuSection.REVENUE}`, label: 'Revenue' }];
      case MenuSection.ALERTS:
        return [{ key: `/${MenuSection.ALERTS}`, label: 'Alerts' }];
      case MenuSection.OVERVIEW:
      default:
        return [
          { key: `/${MenuSection.OVERVIEW}`, label: 'Overview' },
          // { key: `/${MenuSection.OVERVIEW}/alerts`, label: 'Alerts' },
        ];
    }
  }, [activeSection]);

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

  const getHelpComponent = () => {
    switch (activeSection) {
      case MenuSection.LOCATIONS:
        return <LocationsHelp />;
      case MenuSection.CHARGING_STATIONS:
        return <ChargingStationsHelp />;
      case MenuSection.AUTHORIZATIONS:
        return <AuthorizationsHelp />;
      case MenuSection.TRANSACTIONS:
        return <TransactionsHelp />;
      case MenuSection.PARTNERS:
        return <PartnersHelp />;
      case MenuSection.ERROR_LOGS:
        return <ErrorLogsHelp />;
      case MenuSection.ANALYTICS:
      case MenuSection.REVENUE:
      case MenuSection.ALERTS:
        // TODO: Add help components for Analytics, Revenue, and Alerts
        return null;
      case MenuSection.OVERVIEW:
      default:
        return <OverviewHelp />;
    }
  };

  return (
    <AntdLayout.Header
      className="header"
      style={{ backgroundColor: token.colorBgElevated }}
    >
      <Flex flex={1} justify={'space-between'} align={'center'}>
        <Flex flex={1} align={'center'}>
          <Menu
            style={{ width: '100%', borderBottom: 'none' }}
            mode="horizontal"
            selectedKeys={[`/${activeSection}`]}
            onClick={(e) => navigate(e.key)}
            items={menuItems}
          />
          {getHelpComponent()}
        </Flex>

        <Flex align={'center'} gap={12}>
          <DarkModeSwitch
            isDarkMode={mode === 'dark'}
            toggleDarkMode={() => setMode(mode === 'light' ? 'dark' : 'light')}
          />
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
    </AntdLayout.Header>
  );
};

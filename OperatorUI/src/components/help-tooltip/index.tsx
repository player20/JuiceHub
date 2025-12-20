// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { Tooltip, Button, Space } from 'antd';
import { QuestionCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import './style.scss';

export interface HelpTooltipProps {
  title?: string;
  content?: React.ReactNode;
  placement?:
    | 'top'
    | 'left'
    | 'right'
    | 'bottom'
    | 'topLeft'
    | 'topRight'
    | 'bottomLeft'
    | 'bottomRight'
    | 'leftTop'
    | 'leftBottom'
    | 'rightTop'
    | 'rightBottom';
  showHelpLink?: boolean;
}

export const HelpTooltip: React.FC<HelpTooltipProps> = ({
  title = 'Help',
  content,
  placement = 'topRight',
  showHelpLink = true,
}) => {
  const navigate = useNavigate();

  const tooltipContent = (
    <div style={{ maxWidth: 300 }}>
      {content}
      {showHelpLink && (
        <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.2)' }}>
          <Button
            type="link"
            size="small"
            onClick={() => navigate('/help')}
            style={{ padding: 0, color: '#40a9ff' }}
          >
            View full help documentation →
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <Tooltip title={tooltipContent} placement={placement} overlayStyle={{ maxWidth: 350 }}>
      <QuestionCircleOutlined className="help-tooltip-icon" />
    </Tooltip>
  );
};

// Pre-configured help tooltips for common pages
export const OverviewHelp = () => (
  <HelpTooltip
    content={
      <div>
        <p><strong>Dashboard Overview</strong></p>
        <p>View real-time statistics about your charging network including:</p>
        <ul style={{ paddingLeft: 20, margin: '8px 0' }}>
          <li>Online/offline charger status</li>
          <li>Active charging sessions</li>
          <li>Plugin success rates</li>
          <li>Location map</li>
        </ul>
      </div>
    }
  />
);

export const ChargingStationsHelp = () => (
  <HelpTooltip
    content={
      <div>
        <p><strong>Charging Stations</strong></p>
        <p>Manage your OCPP-compatible charging stations:</p>
        <ul style={{ paddingLeft: 20, margin: '8px 0' }}>
          <li><strong>Create:</strong> Register new chargers</li>
          <li><strong>View:</strong> See charger details, EVSEs, and connectors</li>
          <li><strong>Actions:</strong> Remote start/stop, reset, and configure</li>
        </ul>
        <p style={{ marginTop: 8 }}>
          <strong>Need to connect a charger?</strong> Click the help link below for connection instructions.
        </p>
      </div>
    }
  />
);

export const LocationsHelp = () => (
  <HelpTooltip
    content={
      <div>
        <p><strong>Locations</strong></p>
        <p>Organize charging stations by physical location:</p>
        <ul style={{ paddingLeft: 20, margin: '8px 0' }}>
          <li>Add sites with address and coordinates</li>
          <li>View chargers at each location</li>
          <li>Track location-level statistics</li>
        </ul>
      </div>
    }
  />
);

export const AuthorizationsHelp = () => (
  <HelpTooltip
    content={
      <div>
        <p><strong>Authorizations</strong></p>
        <p>Manage RFID cards and authentication tokens:</p>
        <ul style={{ paddingLeft: 20, margin: '8px 0' }}>
          <li>Add new RFID cards/tokens</li>
          <li>Set expiration dates</li>
          <li>Control charging priority</li>
          <li>Enable/disable access</li>
        </ul>
        <p style={{ marginTop: 8 }}>
          Users tap their RFID card on the charger to start/stop sessions.
        </p>
      </div>
    }
  />
);

export const TransactionsHelp = () => (
  <HelpTooltip
    content={
      <div>
        <p><strong>Transactions</strong></p>
        <p>View all charging sessions:</p>
        <ul style={{ paddingLeft: 20, margin: '8px 0' }}>
          <li>Active sessions (currently charging)</li>
          <li>Completed sessions</li>
          <li>Energy consumed (kWh)</li>
          <li>Session duration</li>
          <li>Cost calculations</li>
        </ul>
      </div>
    }
  />
);

export const PartnersHelp = () => (
  <HelpTooltip
    content={
      <div>
        <p><strong>Partners</strong></p>
        <p>Manage roaming and partner integrations:</p>
        <ul style={{ paddingLeft: 20, margin: '8px 0' }}>
          <li>Configure roaming partners</li>
          <li>Set API keys and credentials</li>
          <li>Enable cross-network charging</li>
        </ul>
      </div>
    }
  />
);

export const ErrorLogsHelp = () => (
  <HelpTooltip
    content={
      <div>
        <p><strong>Error Logs</strong></p>
        <p>Troubleshoot charging station issues:</p>
        <ul style={{ paddingLeft: 20, margin: '8px 0' }}>
          <li>View all system errors</li>
          <li>Filter by severity, status, date</li>
          <li>Search error messages</li>
          <li>Export to CSV for analysis</li>
          <li>Mark errors as resolved</li>
        </ul>
      </div>
    }
  />
);

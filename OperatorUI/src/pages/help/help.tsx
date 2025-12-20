// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import React, { useState } from 'react';
import {
  Typography,
  Card,
  Space,
  Collapse,
  Button,
  message,
  Divider,
  Alert,
  Tag,
  Row,
  Col,
} from 'antd';
import {
  CopyOutlined,
  ThunderboltOutlined,
  ApiOutlined,
  SettingOutlined,
  QuestionCircleOutlined,
  SafetyOutlined,
  LinkOutlined,
} from '@ant-design/icons';

const { Title, Paragraph, Text, Link } = Typography;
const { Panel } = Collapse;

export const HelpPage: React.FC = () => {
  const [messageApi, contextHolder] = message.useMessage();

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    messageApi.success(`${label} copied to clipboard!`);
  };

  const ConnectionURL = ({ url, label, protocol }: { url: string; label: string; protocol: string }) => (
    <Card size="small" style={{ marginBottom: 12 }}>
      <Space direction="vertical" style={{ width: '100%' }}>
        <Space>
          <Tag color={protocol === 'auto' ? 'purple' : protocol === 'ocpp2.0.1' ? 'blue' : 'green'}>
            {protocol === 'auto' ? 'OCPP 1.6 & 2.0.1' : protocol.toUpperCase()}
          </Tag>
          <Text strong>{label}</Text>
        </Space>
        <Space style={{ width: '100%' }}>
          <Text code style={{ flex: 1, wordBreak: 'break-all' }}>
            {url}
          </Text>
          <Button
            type="link"
            size="small"
            icon={<CopyOutlined />}
            onClick={() => copyToClipboard(url, label)}
          >
            Copy
          </Button>
        </Space>
      </Space>
    </Card>
  );

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {contextHolder}

      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* Header */}
        <div>
          <Title level={2}>
            <QuestionCircleOutlined /> JuiceNet Help Center
          </Title>
          <Paragraph>
            Welcome to the JuiceNet platform help documentation. Find instructions for connecting charging stations,
            managing your network, and troubleshooting common issues.
          </Paragraph>
        </div>

        {/* Quick Connection Guide */}
        <Card
          title={
            <Space>
              <ThunderboltOutlined />
              <span>Quick Start: Connect Your Charger</span>
            </Space>
          }
          style={{ background: '#f0f5ff' }}
        >
          <Alert
            message="Ready to connect your charging station?"
            description="Follow these simple steps to connect your OCPP-compatible charger to the JuiceNet platform."
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />

          <Title level={4}>Connection URLs</Title>
          <Paragraph>
            Use one of the following WebSocket URLs to connect your charging station to JuiceNet.
            <Text strong> Both OCPP 1.6 and 2.0.1 are automatically supported on all endpoints!</Text>
          </Paragraph>

          <ConnectionURL
            url="ws://localhost:8081"
            label="Universal Endpoint (Security Profile 0 - No TLS)"
            protocol="auto"
          />
          <ConnectionURL
            url="wss://localhost:8082"
            label="Universal Secure Endpoint (Security Profile 2 - TLS + Client Certificate)"
            protocol="auto"
          />

          <Alert
            message="Universal Protocol Support"
            description="All endpoints automatically detect and support both OCPP 1.6 and OCPP 2.0.1. You don't need to know which version your charger uses - just connect and we'll handle it!"
            type="success"
            showIcon
            style={{ marginTop: 16, marginBottom: 16 }}
          />

          <Alert
            message="Production Deployment"
            description="In production, replace 'localhost' with your server's domain name or IP address."
            type="warning"
            showIcon
          />
        </Card>

        {/* Step-by-Step Guide */}
        <Card
          title={
            <Space>
              <SettingOutlined />
              <span>Step-by-Step Setup Guide</span>
            </Space>
          }
        >
          <Collapse defaultActiveKey={['1']} ghost>
            <Panel header={<Text strong>Step 1: Access Your Charger Configuration</Text>} key="1">
              <Paragraph>
                Most OCPP-compatible charging stations have a configuration interface accessible via:
              </Paragraph>
              <ul>
                <li>Web interface (check manufacturer documentation for IP address/URL)</li>
                <li>Mobile app (manufacturer-specific)</li>
                <li>Physical display panel on the charger</li>
                <li>Configuration software (desktop application)</li>
              </ul>
              <Paragraph>
                <Text strong>Common manufacturers:</Text> ABB, ChargePoint, Tesla, Siemens, Tritium, Schneider Electric, Webasto, EVBox
              </Paragraph>
            </Panel>

            <Panel header={<Text strong>Step 2: Configure OCPP Settings</Text>} key="2">
              <Paragraph>In your charger's configuration interface, locate the OCPP settings and configure:</Paragraph>

              <Row gutter={[16, 16]}>
                <Col span={24}>
                  <Card size="small" title="Connection URL">
                    <Paragraph>
                      <Text strong>Field name:</Text> OCPP Central System URL, WebSocket URL, or Server URL
                    </Paragraph>
                    <Paragraph>
                      <Text strong>Value:</Text> <Text code>ws://your-server-ip:8081</Text> (for OCPP 2.0.1)
                    </Paragraph>
                  </Card>
                </Col>

                <Col span={24}>
                  <Card size="small" title="Charger ID">
                    <Paragraph>
                      <Text strong>Field name:</Text> Charge Point ID, Station ID, or Charger Identifier
                    </Paragraph>
                    <Paragraph>
                      <Text strong>Value:</Text> Choose a unique identifier (e.g., CHARGER-001, STATION-ABC)
                    </Paragraph>
                    <Alert
                      message="This ID will appear in the JuiceNet Charging Stations list"
                      type="info"
                      showIcon
                      style={{ marginTop: 8 }}
                    />
                  </Card>
                </Col>

                <Col span={24}>
                  <Card size="small" title="Protocol Version">
                    <Paragraph>
                      <Text strong>Field name:</Text> OCPP Version or Protocol
                    </Paragraph>
                    <Paragraph>
                      <Text strong>Value:</Text> OCPP 2.0.1 or OCPP 1.6 (both supported - server auto-detects)
                    </Paragraph>
                    <Alert
                      message="No need to worry about the version! The server automatically detects whether your charger uses OCPP 1.6 or 2.0.1"
                      type="success"
                      showIcon
                      style={{ marginTop: 8 }}
                    />
                  </Card>
                </Col>

                <Col span={24}>
                  <Card size="small" title="Optional: Authentication">
                    <Paragraph>
                      <Text strong>Basic Auth (if required):</Text>
                    </Paragraph>
                    <ul>
                      <li>Username: <Text code>(check your JuiceNet tenant settings)</Text></li>
                      <li>Password: <Text code>(check your JuiceNet tenant settings)</Text></li>
                    </ul>
                  </Card>
                </Col>
              </Row>
            </Panel>

            <Panel header={<Text strong>Step 3: Register Charger in JuiceNet</Text>} key="3">
              <Paragraph>
                <Text strong>Option A: Auto-registration (Recommended)</Text>
              </Paragraph>
              <ol>
                <li>Configure your charger with the connection URL and Charger ID</li>
                <li>Reboot or reconnect the charger</li>
                <li>The charger will appear automatically in the Charging Stations list</li>
                <li>Status will show as "Online" when connected</li>
              </ol>

              <Divider />

              <Paragraph>
                <Text strong>Option B: Manual registration</Text>
              </Paragraph>
              <ol>
                <li>Go to <Link href="/charging-stations">Charging Stations</Link></li>
                <li>Click "Create" button</li>
                <li>Enter the Charger ID (must match your charger's configured ID)</li>
                <li>Fill in additional details (vendor, model, location)</li>
                <li>Click "Save"</li>
              </ol>
            </Panel>

            <Panel header={<Text strong>Step 4: Verify Connection</Text>} key="4">
              <Paragraph>After configuring your charger:</Paragraph>
              <ol>
                <li>Go to <Link href="/charging-stations">Charging Stations</Link> page</li>
                <li>Look for your charger in the list (search by ID)</li>
                <li>Check the status indicator - should show <Tag color="green">Online</Tag></li>
                <li>Click on the charger to view details</li>
                <li>Check "Boot Notifications" and "Status Notifications" tabs for recent activity</li>
              </ol>

              <Alert
                message="Troubleshooting"
                description="If charger shows as offline, check: network connectivity, firewall rules, correct URL and port, and charger logs."
                type="warning"
                showIcon
                style={{ marginTop: 16 }}
              />
            </Panel>

            <Panel header={<Text strong>Step 5: Configure Location & Details</Text>} key="5">
              <Paragraph>Once connected, enhance your charger setup:</Paragraph>
              <ol>
                <li>Create or select a <Link href="/locations">Location</Link></li>
                <li>Edit your charging station to assign it to the location</li>
                <li>Configure EVSEs (Electric Vehicle Supply Equipment)</li>
                <li>Set up connectors (CCS, CHAdeMO, Type 2, etc.)</li>
                <li>Add <Link href="/authorizations">Authorizations</Link> (RFID cards, tokens)</li>
              </ol>
            </Panel>
          </Collapse>
        </Card>

        {/* Security Profiles */}
        <Card
          title={
            <Space>
              <SafetyOutlined />
              <span>OCPP Security Profiles</span>
            </Space>
          }
        >
          <Row gutter={[16, 16]}>
            <Col xs={24} md={12}>
              <Card size="small" title="Profile 0: Unsecured" bordered={false}>
                <Tag color="orange">Development</Tag>
                <Paragraph style={{ marginTop: 8 }}>
                  <Text strong>Protocol:</Text> WebSocket (ws://)
                </Paragraph>
                <Paragraph>
                  <Text strong>Port:</Text> 8081
                </Paragraph>
                <Paragraph>
                  <Text strong>OCPP Versions:</Text> <Tag color="purple">1.6 & 2.0.1 (Auto-detected)</Tag>
                </Paragraph>
                <Paragraph>
                  <Text strong>Use case:</Text> Development, testing, internal networks
                </Paragraph>
                <Paragraph>
                  <Text type="danger">No encryption - not recommended for production</Text>
                </Paragraph>
              </Card>
            </Col>

            <Col xs={24} md={12}>
              <Card size="small" title="Profile 2: TLS + Client Cert" bordered={false}>
                <Tag color="green">Production</Tag>
                <Paragraph style={{ marginTop: 8 }}>
                  <Text strong>Protocol:</Text> WebSocket Secure (wss://)
                </Paragraph>
                <Paragraph>
                  <Text strong>Port:</Text> 8082
                </Paragraph>
                <Paragraph>
                  <Text strong>OCPP Versions:</Text> <Tag color="purple">1.6 & 2.0.1 (Auto-detected)</Tag>
                </Paragraph>
                <Paragraph>
                  <Text strong>Use case:</Text> Production deployments
                </Paragraph>
                <Paragraph>
                  <Text type="success">TLS encryption + client certificate authentication</Text>
                </Paragraph>
              </Card>
            </Col>
          </Row>
        </Card>

        {/* FAQ */}
        <Card
          title={
            <Space>
              <QuestionCircleOutlined />
              <span>Frequently Asked Questions</span>
            </Space>
          }
        >
          <Collapse ghost>
            <Panel header="My charger won't connect - what should I check?" key="1">
              <Paragraph>
                <Text strong>Network connectivity:</Text>
              </Paragraph>
              <ul>
                <li>Ensure the charger has network access (WiFi or Ethernet)</li>
                <li>Verify firewall rules allow outbound connections on ports 8081, 8082, or 8092</li>
                <li>Test ping/connectivity from charger to server</li>
              </ul>

              <Paragraph style={{ marginTop: 16 }}>
                <Text strong>Configuration:</Text>
              </Paragraph>
              <ul>
                <li>Double-check the connection URL (correct IP/domain and port)</li>
                <li>Ensure your charger supports OCPP 1.6 or 2.0.1 (the server auto-detects the version)</li>
                <li>Ensure Charger ID is unique and matches between charger and JuiceNet</li>
              </ul>

              <Paragraph style={{ marginTop: 16 }}>
                <Text strong>Logs:</Text>
              </Paragraph>
              <ul>
                <li>Check charger's internal logs for connection errors</li>
                <li>View <Link href="/error-logs">Error Logs</Link> in JuiceNet for any issues</li>
              </ul>
            </Panel>

            <Panel header="Can I use a different port?" key="2">
              <Paragraph>
                Yes, you can configure custom ports by modifying the CitrineOS configuration file at
                <Text code>citrineos-core/Server/data/config.json</Text>. Update the <Text code>websocketServers</Text> section
                with your desired ports. After changing the configuration, restart the CitrineOS services.
              </Paragraph>
            </Panel>

            <Panel header="How do I set up RFID authorization?" key="3">
              <Paragraph>
                Go to <Link href="/authorizations">Authorizations</Link> and:
              </Paragraph>
              <ol>
                <li>Click "Create" to add a new authorization</li>
                <li>Enter the RFID token ID (from your card/fob)</li>
                <li>Select token type (usually ISO14443 or ISO15693)</li>
                <li>Click "Save"</li>
              </ol>
              <Paragraph>
                Users can now tap their RFID card on the charger to start/stop charging sessions.
              </Paragraph>
            </Panel>

            <Panel header="How do I remotely start/stop charging?" key="4">
              <Paragraph>
                From the <Link href="/charging-stations">Charging Stations</Link> list:
              </Paragraph>
              <ol>
                <li>Click the "Actions" button on a charger row</li>
                <li>Select "Remote Start" or "Remote Stop"</li>
                <li>Fill in required fields (authorization token, EVSE ID)</li>
                <li>Click "Submit"</li>
              </ol>
              <Paragraph>
                <Text type="warning">Note:</Text> Charger must be online and support remote operations.
              </Paragraph>
            </Panel>

            <Panel header="Where can I view transaction history?" key="5">
              <Paragraph>
                Go to <Link href="/transactions">Transactions</Link> to view:
              </Paragraph>
              <ul>
                <li>All charging sessions (active and completed)</li>
                <li>Energy consumed (kWh)</li>
                <li>Session duration</li>
                <li>Cost calculations</li>
                <li>User/authorization details</li>
              </ul>
              <Paragraph>
                You can also view transaction details from the <Link href="/overview">Overview</Link> dashboard.
              </Paragraph>
            </Panel>

            <Panel header="What's the difference between EVSE and Connector?" key="6">
              <Paragraph>
                <Text strong>EVSE (Electric Vehicle Supply Equipment):</Text> A charging point that can supply
                power to one vehicle at a time. A charging station can have multiple EVSEs.
              </Paragraph>
              <Paragraph style={{ marginTop: 8 }}>
                <Text strong>Connector:</Text> The physical plug/outlet on an EVSE. An EVSE can have multiple
                connectors (e.g., CCS and CHAdeMO), but typically only one can be used at a time.
              </Paragraph>
              <Paragraph style={{ marginTop: 8 }}>
                <Text>Example: One charging station → 2 EVSEs → 4 total connectors (2 per EVSE)</Text>
              </Paragraph>
            </Panel>
          </Collapse>
        </Card>

        {/* Additional Resources */}
        <Card
          title={
            <Space>
              <ApiOutlined />
              <span>Additional Resources</span>
            </Space>
          }
        >
          <Row gutter={[16, 16]}>
            <Col xs={24} md={12}>
              <Card size="small" title="Platform Pages" bordered={false}>
                <ul style={{ paddingLeft: 20 }}>
                  <li><Link href="/overview">Dashboard Overview</Link> - Real-time statistics</li>
                  <li><Link href="/charging-stations">Charging Stations</Link> - Manage chargers</li>
                  <li><Link href="/locations">Locations</Link> - Site management</li>
                  <li><Link href="/transactions">Transactions</Link> - Session history</li>
                  <li><Link href="/authorizations">Authorizations</Link> - RFID/token management</li>
                  <li><Link href="/error-logs">Error Logs</Link> - Troubleshooting</li>
                </ul>
              </Card>
            </Col>

            <Col xs={24} md={12}>
              <Card size="small" title="External Links" bordered={false}>
                <ul style={{ paddingLeft: 20 }}>
                  <li>
                    <Link href="https://github.com/citrineos/citrineos-core" target="_blank">
                      <LinkOutlined /> CitrineOS GitHub Repository
                    </Link>
                  </li>
                  <li>
                    <Link href="https://www.openchargealliance.org/" target="_blank">
                      <LinkOutlined /> Open Charge Alliance (OCPP Specs)
                    </Link>
                  </li>
                  <li>
                    <Link href="https://juicenet.ai" target="_blank">
                      <LinkOutlined /> JuiceNet Website
                    </Link>
                  </li>
                </ul>
              </Card>
            </Col>
          </Row>
        </Card>

        {/* Support */}
        <Alert
          message="Need More Help?"
          description={
            <span>
              Contact our support team or visit the{' '}
              <Link href="https://github.com/citrineos/citrineos-core/issues" target="_blank">
                CitrineOS Issues
              </Link>{' '}
              page for technical support.
            </span>
          }
          type="info"
          showIcon
        />
      </Space>
    </div>
  );
};

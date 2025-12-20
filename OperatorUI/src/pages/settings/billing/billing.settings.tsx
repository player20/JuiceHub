// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import React, { useState } from 'react';
import {
  Typography,
  Card,
  Row,
  Col,
  Button,
  Tag,
  Divider,
  Table,
  Modal,
  Form,
  Input,
  Space,
  Alert,
  Progress,
  Statistic,
} from 'antd';
import {
  CreditCardOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  DownloadOutlined,
  PlusOutlined,
  CrownOutlined,
  RocketOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';

const { Title, Text, Paragraph } = Typography;

export const BillingSettings: React.FC = () => {
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Mock subscription data (would come from API)
  const currentPlan = {
    name: 'Professional',
    tier: 'PROFESSIONAL',
    price: 149,
    billingCycle: 'monthly',
    nextBillingDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
    features: [
      { name: 'Up to 100 charging stations', included: true },
      { name: '50,000 API calls per hour', included: true },
      { name: 'Analytics & Reports', included: true },
      { name: 'Revenue Management', included: true },
      { name: 'Smart Charging', included: true },
      { name: 'Priority Support', included: true },
      { name: 'Custom Branding', included: false },
      { name: 'Vehicle-to-Grid (V2G)', included: false },
    ],
    usage: {
      stations: { current: 42, limit: 100 },
      apiCalls: { current: 12500, limit: 50000 },
      storage: { current: 15.5, limit: 50 },
    },
  };

  // Mock payment methods
  const paymentMethods = [
    {
      id: 1,
      type: 'visa',
      last4: '4242',
      expiry: '12/2025',
      default: true,
    },
    {
      id: 2,
      type: 'mastercard',
      last4: '5555',
      expiry: '08/2024',
      default: false,
    },
  ];

  // Mock billing history
  const billingHistory = [
    {
      id: 'INV-2024-001',
      date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      amount: 149.00,
      status: 'paid',
      description: 'Professional Plan - Monthly',
    },
    {
      id: 'INV-2023-012',
      date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
      amount: 149.00,
      status: 'paid',
      description: 'Professional Plan - Monthly',
    },
    {
      id: 'INV-2023-011',
      date: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
      amount: 149.00,
      status: 'paid',
      description: 'Professional Plan - Monthly',
    },
  ];

  const plans = [
    {
      name: 'Starter',
      price: 49,
      features: ['25 stations', '10K API calls/hr', 'Basic analytics'],
      color: '#1890ff',
    },
    {
      name: 'Professional',
      price: 149,
      features: ['100 stations', '50K API calls/hr', 'Advanced analytics', 'Smart charging'],
      color: '#52c41a',
      recommended: true,
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      features: ['Unlimited stations', 'Unlimited API calls', 'V2G support', 'Dedicated infrastructure'],
      color: '#722ed1',
    },
  ];

  const billingColumns = [
    {
      title: 'Invoice',
      dataIndex: 'id',
      key: 'id',
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      render: (date: Date) => dayjs(date).format('MMM DD, YYYY'),
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount: number) => `$${amount.toFixed(2)}`,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) =>
        status === 'paid' ? (
          <Tag color="success" icon={<CheckCircleOutlined />}>
            Paid
          </Tag>
        ) : (
          <Tag color="error" icon={<CloseCircleOutlined />}>
            Unpaid
          </Tag>
        ),
    },
    {
      title: 'Action',
      key: 'action',
      render: () => (
        <Button type="link" icon={<DownloadOutlined />}>
          Download
        </Button>
      ),
    },
  ];

  return (
    <div>
      <Title level={3}>Billing & Subscription</Title>
      <Text type="secondary">
        Manage your subscription plan and payment methods
      </Text>

      <Divider />

      {/* Current Plan */}
      <Card
        title={
          <Space>
            <span>Current Plan</span>
            <Tag color="blue">{currentPlan.name}</Tag>
          </Space>
        }
        extra={
          <Button type="primary" icon={<RocketOutlined />} onClick={() => setShowUpgradeModal(true)}>
            Upgrade Plan
          </Button>
        }
        style={{ marginBottom: 24 }}
      >
        <Row gutter={24}>
          <Col span={12}>
            <Statistic
              title="Monthly Cost"
              value={currentPlan.price}
              prefix="$"
              suffix="/mo"
            />
            <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
              Next billing date: {dayjs(currentPlan.nextBillingDate).format('MMM DD, YYYY')}
            </Text>
          </Col>
          <Col span={12}>
            <Title level={5}>Plan Features</Title>
            <Space direction="vertical">
              {currentPlan.features.map((feature, index) => (
                <Space key={index}>
                  {feature.included ? (
                    <CheckCircleOutlined style={{ color: '#52c41a' }} />
                  ) : (
                    <CloseCircleOutlined style={{ color: '#d9d9d9' }} />
                  )}
                  <Text type={feature.included ? undefined : 'secondary'}>
                    {feature.name}
                  </Text>
                </Space>
              ))}
            </Space>
          </Col>
        </Row>

        <Divider />

        {/* Usage Overview */}
        <Title level={5}>Current Usage</Title>
        <Row gutter={[16, 16]}>
          <Col span={8}>
            <Text>Charging Stations</Text>
            <Progress
              percent={(currentPlan.usage.stations.current / currentPlan.usage.stations.limit) * 100}
              format={() => `${currentPlan.usage.stations.current} / ${currentPlan.usage.stations.limit}`}
            />
          </Col>
          <Col span={8}>
            <Text>API Calls (per hour)</Text>
            <Progress
              percent={(currentPlan.usage.apiCalls.current / currentPlan.usage.apiCalls.limit) * 100}
              format={() => `${currentPlan.usage.apiCalls.current.toLocaleString()} / ${currentPlan.usage.apiCalls.limit.toLocaleString()}`}
            />
          </Col>
          <Col span={8}>
            <Text>Storage (GB)</Text>
            <Progress
              percent={(currentPlan.usage.storage.current / currentPlan.usage.storage.limit) * 100}
              format={() => `${currentPlan.usage.storage.current} / ${currentPlan.usage.storage.limit} GB`}
            />
          </Col>
        </Row>
      </Card>

      {/* Payment Methods */}
      <Card
        title="Payment Methods"
        extra={
          <Button icon={<PlusOutlined />} onClick={() => setShowPaymentModal(true)}>
            Add Payment Method
          </Button>
        }
        style={{ marginBottom: 24 }}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          {paymentMethods.map((method) => (
            <Card key={method.id} size="small">
              <Row justify="space-between" align="middle">
                <Col>
                  <Space>
                    <CreditCardOutlined style={{ fontSize: 24 }} />
                    <div>
                      <Text strong>
                        {method.type.charAt(0).toUpperCase() + method.type.slice(1)} ending in {method.last4}
                      </Text>
                      <br />
                      <Text type="secondary">Expires {method.expiry}</Text>
                    </div>
                  </Space>
                </Col>
                <Col>
                  <Space>
                    {method.default && <Tag color="blue">Default</Tag>}
                    {!method.default && (
                      <Button type="link">Set as Default</Button>
                    )}
                    <Button type="link" danger>
                      Remove
                    </Button>
                  </Space>
                </Col>
              </Row>
            </Card>
          ))}
        </Space>
      </Card>

      {/* Billing History */}
      <Card title="Billing History">
        <Table
          columns={billingColumns}
          dataSource={billingHistory}
          rowKey="id"
          pagination={{ pageSize: 10 }}
        />
      </Card>

      {/* Upgrade Plan Modal */}
      <Modal
        title="Upgrade Your Plan"
        open={showUpgradeModal}
        onCancel={() => setShowUpgradeModal(false)}
        footer={null}
        width={900}
      >
        <Row gutter={16}>
          {plans.map((plan) => (
            <Col span={8} key={plan.name}>
              <Card
                style={{
                  borderColor: plan.recommended ? plan.color : undefined,
                  borderWidth: plan.recommended ? 2 : 1,
                }}
                headStyle={{
                  backgroundColor: plan.recommended ? plan.color : undefined,
                  color: plan.recommended ? 'white' : undefined,
                }}
                title={
                  <Space>
                    {plan.name}
                    {plan.recommended && <CrownOutlined />}
                  </Space>
                }
              >
                <div style={{ textAlign: 'center', marginBottom: 16 }}>
                  <Title level={2} style={{ margin: 0 }}>
                    {typeof plan.price === 'number' ? `$${plan.price}` : plan.price}
                  </Title>
                  {typeof plan.price === 'number' && (
                    <Text type="secondary">/month</Text>
                  )}
                </div>

                <Space direction="vertical" style={{ width: '100%' }}>
                  {plan.features.map((feature, index) => (
                    <Space key={index}>
                      <CheckCircleOutlined style={{ color: plan.color }} />
                      <Text>{feature}</Text>
                    </Space>
                  ))}
                </Space>

                <Button
                  type={plan.recommended ? 'primary' : 'default'}
                  block
                  style={{ marginTop: 16 }}
                  disabled={plan.name === currentPlan.name}
                >
                  {plan.name === currentPlan.name ? 'Current Plan' : plan.price === 'Custom' ? 'Contact Sales' : 'Select Plan'}
                </Button>
              </Card>
            </Col>
          ))}
        </Row>
      </Modal>

      {/* Add Payment Method Modal */}
      <Modal
        title="Add Payment Method"
        open={showPaymentModal}
        onCancel={() => setShowPaymentModal(false)}
        onOk={() => setShowPaymentModal(false)}
      >
        <Form layout="vertical">
          <Form.Item label="Card Number" required>
            <Input placeholder="1234 5678 9012 3456" maxLength={19} />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Expiry Date" required>
                <Input placeholder="MM/YY" maxLength={5} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="CVC" required>
                <Input placeholder="123" maxLength={4} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="Cardholder Name" required>
            <Input placeholder="John Doe" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

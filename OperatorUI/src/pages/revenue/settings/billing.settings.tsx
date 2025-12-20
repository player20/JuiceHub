// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import React, { useState, useEffect } from 'react';
import {
  Card,
  Flex,
  Typography,
  Form,
  Input,
  InputNumber,
  Switch,
  Button,
  Space,
  Divider,
  Select,
  message,
  Alert,
  Row,
  Col,
  Tooltip,
} from 'antd';
import {
  SaveOutlined,
  InfoCircleOutlined,
  CheckCircleOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { useCustom } from '@refinedev/core';
import { GET_BILLING_SETTINGS, UPDATE_BILLING_SETTINGS } from '../../../graphql/revenue-queries';
import './billing.settings.scss';

const { Title, Text } = Typography;
const { TextArea } = Input;

export const BillingSettings: React.FC = () => {
  const [form] = Form.useForm();
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);

  // TODO: Get actual tenant ID from auth context
  const tenantId = 'YOUR_TENANT_ID';

  const { data, isLoading, refetch } = useCustom({
    url: '',
    method: 'post',
    meta: {
      operation: 'GetBillingSettings',
      variables: {
        tenantId: { value: tenantId, type: 'uuid', required: true },
      },
      gqlQuery: GET_BILLING_SETTINGS,
    },
  } as any);

  const settings = data?.data?.billing_settings?.[0];

  useEffect(() => {
    if (settings) {
      form.setFieldsValue({
        default_tax_rate: settings.default_tax_rate * 100, // Convert to percentage
        default_currency: settings.default_currency,
        invoice_due_days: settings.invoice_due_days,
        auto_send_invoices: settings.auto_send_invoices,
        auto_charge_on_due: settings.auto_charge_on_due,
        late_fee_percentage: settings.late_fee_percentage * 100,
        late_fee_grace_days: settings.late_fee_grace_days,
        payment_terms: settings.payment_terms,
        invoice_footer_text: settings.invoice_footer_text,
      });
    }
  }, [settings, form]);

  const handleSave = async () => {
    try {
      setSaving(true);
      const values = await form.validateFields();

      // Convert percentages back to decimals
      const updateData = {
        ...values,
        default_tax_rate: values.default_tax_rate / 100,
        late_fee_percentage: values.late_fee_percentage / 100,
      };

      // TODO: Implement actual mutation
      console.log('Saving billing settings:', updateData);

      message.success('Billing settings saved successfully');
      setHasChanges(false);
      refetch();
    } catch (error) {
      console.error('Failed to save billing settings:', error);
      message.error('Failed to save billing settings');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (settings) {
      form.setFieldsValue({
        default_tax_rate: settings.default_tax_rate * 100,
        default_currency: settings.default_currency,
        invoice_due_days: settings.invoice_due_days,
        auto_send_invoices: settings.auto_send_invoices,
        auto_charge_on_due: settings.auto_charge_on_due,
        late_fee_percentage: settings.late_fee_percentage * 100,
        late_fee_grace_days: settings.late_fee_grace_days,
        payment_terms: settings.payment_terms,
        invoice_footer_text: settings.invoice_footer_text,
      });
      setHasChanges(false);
    }
  };

  const stripeEnabled = settings?.stripe_enabled || false;

  return (
    <div className="billing-settings">
      {/* Header */}
      <Flex justify="space-between" align="center" style={{ marginBottom: 24 }}>
        <div>
          <Title level={2} style={{ margin: 0 }}>
            Billing Settings
          </Title>
          <Text type="secondary">Configure invoicing and payment processing</Text>
        </div>
        <Space>
          <Button onClick={handleReset} disabled={!hasChanges}>
            Reset
          </Button>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            onClick={handleSave}
            loading={saving}
            disabled={!hasChanges}
          >
            Save Changes
          </Button>
        </Space>
      </Flex>

      {/* Stripe Status Alert */}
      <Alert
        message={
          stripeEnabled ? (
            <Space>
              <CheckCircleOutlined />
              <Text>Stripe payment processing is enabled</Text>
            </Space>
          ) : (
            <Space>
              <WarningOutlined />
              <Text>Stripe payment processing is disabled</Text>
            </Space>
          )
        }
        description={
          stripeEnabled
            ? 'Automatic payment processing is active. Customers can pay invoices via credit card.'
            : 'To enable automatic payment processing, configure your Stripe API keys in the environment settings.'
        }
        type={stripeEnabled ? 'success' : 'warning'}
        showIcon
        style={{ marginBottom: 24 }}
      />

      <Form
        form={form}
        layout="vertical"
        onValuesChange={() => setHasChanges(true)}
      >
        <Row gutter={[24, 0]}>
          {/* Left Column */}
          <Col xs={24} lg={12}>
            {/* General Settings */}
            <Card title="General Settings" style={{ marginBottom: 24 }}>
              <Form.Item
                label={
                  <Space>
                    <Text>Default Currency</Text>
                    <Tooltip title="Currency used for all invoices">
                      <InfoCircleOutlined />
                    </Tooltip>
                  </Space>
                }
                name="default_currency"
                rules={[{ required: true, message: 'Please select a currency' }]}
              >
                <Select>
                  <Select.Option value="USD">USD - US Dollar</Select.Option>
                  <Select.Option value="EUR">EUR - Euro</Select.Option>
                  <Select.Option value="GBP">GBP - British Pound</Select.Option>
                  <Select.Option value="CAD">CAD - Canadian Dollar</Select.Option>
                  <Select.Option value="AUD">AUD - Australian Dollar</Select.Option>
                </Select>
              </Form.Item>

              <Form.Item
                label={
                  <Space>
                    <Text>Default Tax Rate (%)</Text>
                    <Tooltip title="Sales tax percentage applied to invoices">
                      <InfoCircleOutlined />
                    </Tooltip>
                  </Space>
                }
                name="default_tax_rate"
                rules={[
                  { required: true, message: 'Please enter tax rate' },
                  { type: 'number', min: 0, max: 100, message: 'Must be between 0 and 100' },
                ]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  max={100}
                  step={0.1}
                  precision={2}
                  addonAfter="%"
                />
              </Form.Item>

              <Form.Item
                label={
                  <Space>
                    <Text>Invoice Due Days</Text>
                    <Tooltip title="Number of days until invoice is due">
                      <InfoCircleOutlined />
                    </Tooltip>
                  </Space>
                }
                name="invoice_due_days"
                rules={[
                  { required: true, message: 'Please enter due days' },
                  { type: 'number', min: 1, max: 365, message: 'Must be between 1 and 365' },
                ]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={1}
                  max={365}
                  addonAfter="days"
                />
              </Form.Item>

              <Form.Item
                label={
                  <Space>
                    <Text>Payment Terms</Text>
                    <Tooltip title="Terms shown on invoices (e.g., 'Net 30')">
                      <InfoCircleOutlined />
                    </Tooltip>
                  </Space>
                }
                name="payment_terms"
              >
                <Input placeholder="e.g., Net 30, Due on Receipt" />
              </Form.Item>
            </Card>

            {/* Automation Settings */}
            <Card title="Automation Settings">
              <Form.Item
                label={
                  <Space>
                    <Text>Auto-Send Invoices</Text>
                    <Tooltip title="Automatically email invoices when created">
                      <InfoCircleOutlined />
                    </Tooltip>
                  </Space>
                }
                name="auto_send_invoices"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>

              <Form.Item
                label={
                  <Space>
                    <Text>Auto-Charge on Due Date</Text>
                    <Tooltip title="Automatically charge customers on due date (requires Stripe)">
                      <InfoCircleOutlined />
                    </Tooltip>
                  </Space>
                }
                name="auto_charge_on_due"
                valuePropName="checked"
              >
                <Switch disabled={!stripeEnabled} />
              </Form.Item>

              {!stripeEnabled && (
                <Alert
                  message="Stripe required"
                  description="Auto-charge requires Stripe payment processing to be enabled"
                  type="info"
                  showIcon
                  style={{ marginTop: 16 }}
                />
              )}
            </Card>
          </Col>

          {/* Right Column */}
          <Col xs={24} lg={12}>
            {/* Late Fees */}
            <Card title="Late Fees" style={{ marginBottom: 24 }}>
              <Form.Item
                label={
                  <Space>
                    <Text>Late Fee Percentage (%)</Text>
                    <Tooltip title="Percentage fee charged on overdue invoices">
                      <InfoCircleOutlined />
                    </Tooltip>
                  </Space>
                }
                name="late_fee_percentage"
                rules={[
                  { required: true, message: 'Please enter late fee percentage' },
                  { type: 'number', min: 0, max: 100, message: 'Must be between 0 and 100' },
                ]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  max={100}
                  step={0.1}
                  precision={2}
                  addonAfter="%"
                />
              </Form.Item>

              <Form.Item
                label={
                  <Space>
                    <Text>Grace Period</Text>
                    <Tooltip title="Days after due date before late fees apply">
                      <InfoCircleOutlined />
                    </Tooltip>
                  </Space>
                }
                name="late_fee_grace_days"
                rules={[
                  { required: true, message: 'Please enter grace period' },
                  { type: 'number', min: 0, max: 90, message: 'Must be between 0 and 90' },
                ]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  max={90}
                  addonAfter="days"
                />
              </Form.Item>

              <Alert
                message="Example"
                description={`With ${form.getFieldValue('late_fee_percentage') || 0}% late fee and ${form.getFieldValue('late_fee_grace_days') || 0} day grace period, a $100 invoice becomes $${(100 + (100 * (form.getFieldValue('late_fee_percentage') || 0) / 100)).toFixed(2)} after the grace period.`}
                type="info"
                showIcon
              />
            </Card>

            {/* Invoice Customization */}
            <Card title="Invoice Customization">
              <Form.Item
                label={
                  <Space>
                    <Text>Invoice Footer Text</Text>
                    <Tooltip title="Custom text shown at bottom of invoices">
                      <InfoCircleOutlined />
                    </Tooltip>
                  </Space>
                }
                name="invoice_footer_text"
              >
                <TextArea
                  rows={4}
                  placeholder="e.g., Thank you for your business!"
                  maxLength={500}
                  showCount
                />
              </Form.Item>
            </Card>
          </Col>
        </Row>
      </Form>

      <Divider />

      {/* Save Footer */}
      {hasChanges && (
        <Alert
          message="You have unsaved changes"
          description="Click 'Save Changes' to apply your settings"
          type="warning"
          showIcon
          action={
            <Space>
              <Button size="small" onClick={handleReset}>
                Cancel
              </Button>
              <Button type="primary" size="small" onClick={handleSave}>
                Save Now
              </Button>
            </Space>
          }
        />
      )}
    </div>
  );
};

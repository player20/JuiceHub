// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import {
  Card,
  Flex,
  Typography,
  Row,
  Col,
  Descriptions,
  Table,
  Tag,
  Button,
  Space,
  Divider,
  Badge,
  Statistic,
  Timeline,
  Empty,
  message,
} from 'antd';
import {
  DownloadOutlined,
  FilePdfOutlined,
  MailOutlined,
  DollarOutlined,
  EditOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  WarningOutlined,
  ArrowLeftOutlined,
} from '@ant-design/icons';
import { useParams } from 'react-router-dom';
import { useCustom, useNavigation } from '@refinedev/core';
import { GET_INVOICE_DETAIL } from '../../../graphql/revenue-queries';
import dayjs from 'dayjs';
import './invoice.detail.scss';

const { Title, Text } = Typography;

export const InvoiceDetail: React.FC = () => {
  const { push, goBack } = useNavigation();
  const { id } = useParams();

  const { data, isLoading } = useCustom({
    url: '',
    method: 'post',
    meta: {
      operation: 'GetInvoiceDetail',
      variables: {
        id: { value: id, type: 'uuid', required: true },
      },
      gqlQuery: GET_INVOICE_DETAIL,
    },
  } as any);

  const invoice = data?.data?.invoices_by_pk;

  if (isLoading) {
    return (
      <div className="invoice-detail" style={{ padding: 24 }}>
        <Card loading />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="invoice-detail" style={{ padding: 24 }}>
        <Card>
          <Empty description="Invoice not found" />
        </Card>
      </div>
    );
  }

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'paid':
        return 'success';
      case 'sent':
        return 'processing';
      case 'overdue':
        return 'error';
      case 'draft':
        return 'default';
      case 'cancelled':
        return 'default';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'sent':
        return <ClockCircleOutlined style={{ color: '#1890ff' }} />;
      case 'overdue':
        return <WarningOutlined style={{ color: '#f5222d' }} />;
      default:
        return null;
    }
  };

  const isOverdue = dayjs(invoice.due_date).isBefore(dayjs()) && invoice.status !== 'paid';
  const amountDue = invoice.total_amount - (invoice.amount_paid || 0);

  const handleDownloadPDF = () => {
    if (invoice.pdf_path) {
      message.success('Downloading PDF...');
      // TODO: Implement actual PDF download
    } else {
      message.info('PDF not yet generated. Generating now...');
      // TODO: Call invoice service to generate PDF
    }
  };

  const handleSendEmail = () => {
    message.success('Sending invoice via email...');
    // TODO: Implement email sending
  };

  const handleRecordPayment = () => {
    push(`/revenue/payments/create?invoiceId=${invoice.id}`);
  };

  // Line items table
  const lineItemsColumns = [
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      render: (desc: string, record: any) => (
        <Flex vertical gap={4}>
          <Text strong>{desc}</Text>
          {record.ChargingSession && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              Session: {record.charging_session_id}
              <br />
              {dayjs(record.ChargingSession.start_timestamp).format('MMM DD, YYYY HH:mm')} -{' '}
              {dayjs(record.ChargingSession.end_timestamp).format('HH:mm')}
            </Text>
          )}
        </Flex>
      ),
    },
    {
      title: 'Quantity',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 100,
      align: 'right' as const,
      render: (qty: number) => qty.toFixed(2),
    },
    {
      title: 'Unit Price',
      dataIndex: 'unit_price',
      key: 'unit_price',
      width: 120,
      align: 'right' as const,
      render: (price: number) => `$${price.toFixed(3)}`,
    },
    {
      title: 'Total',
      dataIndex: 'total_price',
      key: 'total_price',
      width: 120,
      align: 'right' as const,
      render: (total: number) => (
        <Text strong style={{ fontSize: 15 }}>
          ${total.toFixed(2)}
        </Text>
      ),
    },
  ];

  return (
    <div className="invoice-detail">
      {/* Header */}
      <Flex justify="space-between" align="center" style={{ marginBottom: 24 }}>
        <div>
          <Button icon={<ArrowLeftOutlined />} onClick={goBack} style={{ marginBottom: 8 }}>
            Back to Invoices
          </Button>
          <Title level={2} style={{ margin: 0 }}>
            Invoice {invoice.invoice_number}
          </Title>
          <Space>
            {getStatusIcon(invoice.status)}
            <Tag color={getStatusColor(invoice.status)}>{invoice.status.toUpperCase()}</Tag>
            {isOverdue && <Tag color="error">OVERDUE</Tag>}
          </Space>
        </div>
        <Space>
          <Button icon={<EditOutlined />}>Edit</Button>
          <Button icon={<MailOutlined />} onClick={handleSendEmail}>
            Send Email
          </Button>
          <Button icon={<FilePdfOutlined />} onClick={handleDownloadPDF}>
            Download PDF
          </Button>
          {invoice.status !== 'paid' && amountDue > 0 && (
            <Button type="primary" icon={<DollarOutlined />} onClick={handleRecordPayment}>
              Record Payment
            </Button>
          )}
        </Space>
      </Flex>

      <Row gutter={[16, 16]}>
        {/* Left Column - Invoice Details */}
        <Col xs={24} lg={16}>
          {/* Summary Stats */}
          <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
            <Col span={8}>
              <Card>
                <Statistic
                  title="Total Amount"
                  value={invoice.total_amount}
                  precision={2}
                  prefix="$"
                  valueStyle={{ fontSize: 24 }}
                />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Statistic
                  title="Amount Paid"
                  value={invoice.amount_paid || 0}
                  precision={2}
                  prefix="$"
                  valueStyle={{ fontSize: 24, color: '#52c41a' }}
                />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Statistic
                  title="Amount Due"
                  value={amountDue}
                  precision={2}
                  prefix="$"
                  valueStyle={{ fontSize: 24, color: amountDue > 0 ? '#f5222d' : '#52c41a' }}
                />
              </Card>
            </Col>
          </Row>

          {/* Line Items */}
          <Card title="Line Items" style={{ marginBottom: 16 }}>
            <Table
              columns={lineItemsColumns}
              dataSource={invoice.LineItems || []}
              rowKey="id"
              pagination={false}
              summary={(data) => {
                return (
                  <>
                    <Table.Summary.Row>
                      <Table.Summary.Cell index={0} colSpan={3} align="right">
                        <Text strong>Subtotal:</Text>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={1} align="right">
                        <Text strong>${invoice.subtotal.toFixed(2)}</Text>
                      </Table.Summary.Cell>
                    </Table.Summary.Row>
                    {invoice.tax_amount > 0 && (
                      <Table.Summary.Row>
                        <Table.Summary.Cell index={0} colSpan={3} align="right">
                          <Text>Tax ({(invoice.tax_rate * 100).toFixed(1)}%):</Text>
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={1} align="right">
                          <Text>${invoice.tax_amount.toFixed(2)}</Text>
                        </Table.Summary.Cell>
                      </Table.Summary.Row>
                    )}
                    <Table.Summary.Row style={{ backgroundColor: '#fafafa' }}>
                      <Table.Summary.Cell index={0} colSpan={3} align="right">
                        <Text strong style={{ fontSize: 16 }}>
                          Total:
                        </Text>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={1} align="right">
                        <Text strong style={{ fontSize: 16 }}>
                          ${invoice.total_amount.toFixed(2)}
                        </Text>
                      </Table.Summary.Cell>
                    </Table.Summary.Row>
                  </>
                );
              }}
            />
            {invoice.notes && (
              <>
                <Divider />
                <Text type="secondary">
                  <strong>Notes:</strong> {invoice.notes}
                </Text>
              </>
            )}
          </Card>

          {/* Payment History */}
          <Card title="Payment History">
            {invoice.Payments && invoice.Payments.length > 0 ? (
              <Timeline
                items={invoice.Payments.map((payment: any) => ({
                  color: payment.status === 'completed' ? 'green' : 'gray',
                  children: (
                    <Flex vertical gap={4}>
                      <Flex justify="space-between">
                        <Text strong>${payment.amount.toFixed(2)}</Text>
                        <Tag color={payment.status === 'completed' ? 'success' : 'default'}>
                          {payment.status}
                        </Tag>
                      </Flex>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {dayjs(payment.payment_date).format('MMM DD, YYYY HH:mm')}
                      </Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        Method: {payment.payment_method}
                      </Text>
                      {payment.transaction_id && (
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          Transaction ID: {payment.transaction_id}
                        </Text>
                      )}
                      {payment.notes && (
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {payment.notes}
                        </Text>
                      )}
                    </Flex>
                  ),
                }))}
              />
            ) : (
              <Empty description="No payments recorded" />
            )}
          </Card>
        </Col>

        {/* Right Column - Customer Info */}
        <Col xs={24} lg={8}>
          <Card title="Customer Information" style={{ marginBottom: 16 }}>
            <Descriptions column={1} size="small">
              <Descriptions.Item label="Name">{invoice.customer_name}</Descriptions.Item>
              <Descriptions.Item label="Email">{invoice.customer_email}</Descriptions.Item>
              {invoice.customer_phone && (
                <Descriptions.Item label="Phone">{invoice.customer_phone}</Descriptions.Item>
              )}
              {invoice.billing_address && (
                <Descriptions.Item label="Address">
                  <pre style={{ margin: 0, fontFamily: 'inherit' }}>
                    {invoice.billing_address}
                  </pre>
                </Descriptions.Item>
              )}
            </Descriptions>
          </Card>

          <Card title="Invoice Information">
            <Descriptions column={1} size="small">
              <Descriptions.Item label="Invoice #">{invoice.invoice_number}</Descriptions.Item>
              <Descriptions.Item label="Issue Date">
                {dayjs(invoice.issue_date).format('MMM DD, YYYY')}
              </Descriptions.Item>
              <Descriptions.Item label="Due Date">
                <Text type={isOverdue ? 'danger' : undefined}>
                  {dayjs(invoice.due_date).format('MMM DD, YYYY')}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="Currency">{invoice.currency}</Descriptions.Item>
              <Descriptions.Item label="Status">
                <Badge status={getStatusColor(invoice.status) as any} text={invoice.status} />
              </Descriptions.Item>
              <Descriptions.Item label="Created">
                {dayjs(invoice.created_at).format('MMM DD, YYYY HH:mm')}
              </Descriptions.Item>
              {invoice.updated_at && invoice.updated_at !== invoice.created_at && (
                <Descriptions.Item label="Updated">
                  {dayjs(invoice.updated_at).format('MMM DD, YYYY HH:mm')}
                </Descriptions.Item>
              )}
            </Descriptions>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

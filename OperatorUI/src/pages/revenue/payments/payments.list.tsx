// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import React, { useState } from 'react';
import {
  Card,
  Flex,
  Typography,
  Table,
  Tag,
  Button,
  Input,
  Select,
  Space,
  DatePicker,
  Statistic,
  Row,
  Col,
  Tooltip,
} from 'antd';
import {
  SearchOutlined,
  FilterOutlined,
  DollarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  CreditCardOutlined,
  BankOutlined,
  WalletOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { useCustom, useNavigation } from '@refinedev/core';
import { GET_PAYMENTS } from '../../../graphql/revenue-queries';
import dayjs from 'dayjs';
import './payments.list.scss';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';
type PaymentMethod = 'credit_card' | 'bank_transfer' | 'cash' | 'other';

export const PaymentsList: React.FC = () => {
  const { push } = useNavigation();
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | 'all'>('all');
  const [methodFilter, setMethodFilter] = useState<PaymentMethod | 'all'>('all');
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Build where clause
  const whereClause: any = {};

  if (searchText) {
    whereClause._or = [
      { transaction_id: { _ilike: `%${searchText}%` } },
      { Invoice: { invoice_number: { _ilike: `%${searchText}%` } } },
      { Invoice: { customer_name: { _ilike: `%${searchText}%` } } },
    ];
  }

  if (statusFilter !== 'all') {
    whereClause.status = { _eq: statusFilter };
  }

  if (methodFilter !== 'all') {
    whereClause.payment_method = { _eq: methodFilter };
  }

  if (dateRange) {
    whereClause.payment_date = {
      _gte: dateRange[0].format('YYYY-MM-DD'),
      _lte: dateRange[1].format('YYYY-MM-DD'),
    };
  }

  const { data, isLoading } = useCustom({
    url: '',
    method: 'post',
    meta: {
      operation: 'GetPayments',
      variables: {
        limit: { value: pageSize, type: 'Int', required: true },
        offset: { value: (currentPage - 1) * pageSize, type: 'Int', required: true },
        where: { value: whereClause, type: 'payments_bool_exp', required: false },
        orderBy: {
          value: [{ payment_date: 'desc' }],
          type: '[payments_order_by!]',
          required: false,
        },
      },
      gqlQuery: GET_PAYMENTS,
    },
  } as any);

  const payments = data?.data?.payments || [];
  const totalCount = data?.data?.payments_aggregate?.aggregate?.count || 0;
  const totalAmount = data?.data?.payments_aggregate?.aggregate?.sum?.amount || 0;

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'pending':
        return 'processing';
      case 'failed':
        return 'error';
      case 'refunded':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'pending':
        return <ClockCircleOutlined style={{ color: '#1890ff' }} />;
      case 'failed':
        return <CloseCircleOutlined style={{ color: '#f5222d' }} />;
      case 'refunded':
        return <DollarOutlined style={{ color: '#faad14' }} />;
      default:
        return null;
    }
  };

  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'credit_card':
        return <CreditCardOutlined />;
      case 'bank_transfer':
        return <BankOutlined />;
      case 'cash':
        return <WalletOutlined />;
      default:
        return <DollarOutlined />;
    }
  };

  const columns = [
    {
      title: 'Date',
      dataIndex: 'payment_date',
      key: 'payment_date',
      width: 150,
      sorter: true,
      render: (date: string) => dayjs(date).format('MMM DD, YYYY HH:mm'),
    },
    {
      title: 'Transaction ID',
      dataIndex: 'transaction_id',
      key: 'transaction_id',
      width: 200,
      render: (text: string) => (
        <Text code style={{ fontSize: 12 }}>
          {text}
        </Text>
      ),
    },
    {
      title: 'Invoice',
      dataIndex: 'Invoice',
      key: 'invoice',
      width: 150,
      render: (invoice: any) => (
        <Button
          type="link"
          onClick={() => push(`/revenue/invoices/${invoice.id}`)}
          style={{ padding: 0 }}
        >
          {invoice.invoice_number}
        </Button>
      ),
    },
    {
      title: 'Customer',
      key: 'customer',
      width: 200,
      render: (_: any, record: any) => record.Invoice?.customer_name || '-',
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      width: 120,
      sorter: true,
      render: (amount: number) => (
        <Text strong style={{ fontSize: 15 }}>
          ${amount.toFixed(2)}
        </Text>
      ),
    },
    {
      title: 'Method',
      dataIndex: 'payment_method',
      key: 'payment_method',
      width: 150,
      filters: [
        { text: 'Credit Card', value: 'credit_card' },
        { text: 'Bank Transfer', value: 'bank_transfer' },
        { text: 'Cash', value: 'cash' },
        { text: 'Other', value: 'other' },
      ],
      render: (method: string) => (
        <Space>
          {getMethodIcon(method)}
          <Text>{method.replace('_', ' ').toUpperCase()}</Text>
        </Space>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      filters: [
        { text: 'Completed', value: 'completed' },
        { text: 'Pending', value: 'pending' },
        { text: 'Failed', value: 'failed' },
        { text: 'Refunded', value: 'refunded' },
      ],
      render: (status: string) => (
        <Space>
          {getStatusIcon(status)}
          <Tag color={getStatusColor(status)}>{status.toUpperCase()}</Tag>
        </Space>
      ),
    },
    {
      title: 'Stripe ID',
      dataIndex: 'stripe_payment_intent_id',
      key: 'stripe_payment_intent_id',
      width: 150,
      render: (id: string) =>
        id ? (
          <Tooltip title={id}>
            <Text code style={{ fontSize: 11 }}>
              {id.substring(0, 15)}...
            </Text>
          </Tooltip>
        ) : (
          '-'
        ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 80,
      fixed: 'right' as const,
      render: (_: any, record: any) => (
        <Tooltip title="View Invoice">
          <Button
            type="text"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => push(`/revenue/invoices/${record.invoice_id}`)}
          />
        </Tooltip>
      ),
    },
  ];

  return (
    <div className="payments-list">
      {/* Header */}
      <Flex justify="space-between" align="center" style={{ marginBottom: 24 }}>
        <div>
          <Title level={2} style={{ margin: 0 }}>
            Payments
          </Title>
          <Text type="secondary">Track all payment transactions</Text>
        </div>
      </Flex>

      {/* Summary Stats */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Payments"
              value={totalCount}
              prefix={<DollarOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Amount"
              value={totalAmount}
              precision={2}
              prefix="$"
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Completed"
              value={payments.filter((p: any) => p.status === 'completed').length}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Failed"
              value={payments.filter((p: any) => p.status === 'failed').length}
              prefix={<CloseCircleOutlined />}
              valueStyle={{ color: '#f5222d' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Filters */}
      <Card style={{ marginBottom: 24 }}>
        <Flex gap={16} wrap="wrap">
          <Input
            placeholder="Search payments..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 300 }}
            allowClear
          />
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            style={{ width: 150 }}
          >
            <Select.Option value="all">All Statuses</Select.Option>
            <Select.Option value="completed">Completed</Select.Option>
            <Select.Option value="pending">Pending</Select.Option>
            <Select.Option value="failed">Failed</Select.Option>
            <Select.Option value="refunded">Refunded</Select.Option>
          </Select>
          <Select
            value={methodFilter}
            onChange={setMethodFilter}
            style={{ width: 180 }}
          >
            <Select.Option value="all">All Methods</Select.Option>
            <Select.Option value="credit_card">Credit Card</Select.Option>
            <Select.Option value="bank_transfer">Bank Transfer</Select.Option>
            <Select.Option value="cash">Cash</Select.Option>
            <Select.Option value="other">Other</Select.Option>
          </Select>
          <RangePicker
            value={dateRange}
            onChange={(dates) => setDateRange(dates as any)}
            format="MMM DD, YYYY"
            placeholder={['Start Date', 'End Date']}
          />
        </Flex>
      </Card>

      {/* Payments Table */}
      <Card>
        <Table
          columns={columns}
          dataSource={payments}
          loading={isLoading}
          rowKey="id"
          scroll={{ x: 1400 }}
          pagination={{
            current: currentPage,
            pageSize: pageSize,
            total: totalCount,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} payments`,
            onChange: (page, size) => {
              setCurrentPage(page);
              setPageSize(size);
            },
          }}
        />
      </Card>
    </div>
  );
};

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
  Badge,
  Tooltip,
} from 'antd';
import {
  SearchOutlined,
  FilterOutlined,
  FileTextOutlined,
  EyeOutlined,
  DownloadOutlined,
  PlusOutlined,
  DollarOutlined,
} from '@ant-design/icons';
import { useCustom, useNavigation } from '@refinedev/core';
import { GET_INVOICES } from '../../../graphql/revenue-queries';
import dayjs from 'dayjs';
import './invoices.list.scss';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';

export const InvoicesList: React.FC = () => {
  const { push } = useNavigation();
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'all'>('all');
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Build where clause
  const whereClause: any = {};

  if (searchText) {
    whereClause._or = [
      { invoice_number: { _ilike: `%${searchText}%` } },
      { customer_name: { _ilike: `%${searchText}%` } },
      { customer_email: { _ilike: `%${searchText}%` } },
    ];
  }

  if (statusFilter !== 'all') {
    whereClause.status = { _eq: statusFilter };
  }

  if (dateRange) {
    whereClause.issue_date = {
      _gte: dateRange[0].format('YYYY-MM-DD'),
      _lte: dateRange[1].format('YYYY-MM-DD'),
    };
  }

  const { data, isLoading } = useCustom({
    url: '',
    method: 'post',
    meta: {
      operation: 'GetInvoices',
      variables: {
        limit: { value: pageSize, type: 'Int', required: true },
        offset: { value: (currentPage - 1) * pageSize, type: 'Int', required: true },
        where: { value: whereClause, type: 'invoices_bool_exp', required: false },
        orderBy: {
          value: [{ issue_date: 'desc' }],
          type: '[invoices_order_by!]',
          required: false,
        },
      },
      gqlQuery: GET_INVOICES,
    },
  } as any);

  const invoices = data?.data?.invoices || [];
  const totalCount = data?.data?.invoices_aggregate?.aggregate?.count || 0;

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
        return 'success';
      case 'sent':
        return 'processing';
      case 'overdue':
        return 'error';
      default:
        return 'default';
    }
  };

  const columns = [
    {
      title: 'Invoice #',
      dataIndex: 'invoice_number',
      key: 'invoice_number',
      fixed: 'left' as const,
      width: 150,
      render: (text: string, record: any) => (
        <Button
          type="link"
          icon={<FileTextOutlined />}
          onClick={() => push(`/revenue/invoices/${record.id}`)}
        >
          {text}
        </Button>
      ),
    },
    {
      title: 'Customer',
      dataIndex: 'customer_name',
      key: 'customer_name',
      width: 200,
      render: (name: string, record: any) => (
        <Flex vertical gap={4}>
          <Text strong>{name}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.customer_email}
          </Text>
        </Flex>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      filters: [
        { text: 'Draft', value: 'draft' },
        { text: 'Sent', value: 'sent' },
        { text: 'Paid', value: 'paid' },
        { text: 'Overdue', value: 'overdue' },
        { text: 'Cancelled', value: 'cancelled' },
      ],
      render: (status: string) => (
        <Badge status={getStatusIcon(status)} text={<Tag color={getStatusColor(status)}>{status.toUpperCase()}</Tag>} />
      ),
    },
    {
      title: 'Issue Date',
      dataIndex: 'issue_date',
      key: 'issue_date',
      width: 120,
      sorter: true,
      render: (date: string) => dayjs(date).format('MMM DD, YYYY'),
    },
    {
      title: 'Due Date',
      dataIndex: 'due_date',
      key: 'due_date',
      width: 120,
      sorter: true,
      render: (date: string, record: any) => {
        const isOverdue = dayjs(date).isBefore(dayjs()) && record.status !== 'paid';
        return (
          <Text type={isOverdue ? 'danger' : undefined}>
            {dayjs(date).format('MMM DD, YYYY')}
          </Text>
        );
      },
    },
    {
      title: 'Amount',
      dataIndex: 'total_amount',
      key: 'total_amount',
      width: 120,
      sorter: true,
      render: (amount: number) => (
        <Text strong style={{ fontSize: 15 }}>
          ${amount.toFixed(2)}
        </Text>
      ),
    },
    {
      title: 'Paid',
      dataIndex: 'amount_paid',
      key: 'amount_paid',
      width: 120,
      render: (paid: number, record: any) => {
        const percentage = record.total_amount > 0 ? (paid / record.total_amount) * 100 : 0;
        return (
          <Flex vertical gap={4}>
            <Text>${paid.toFixed(2)}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {percentage.toFixed(0)}%
            </Text>
          </Flex>
        );
      },
    },
    {
      title: 'Items',
      key: 'items',
      width: 80,
      render: (_: any, record: any) => (
        <Tag>{record.LineItems_aggregate?.aggregate?.count || 0}</Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      fixed: 'right' as const,
      render: (_: any, record: any) => (
        <Space size="small">
          <Tooltip title="View Details">
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => push(`/revenue/invoices/${record.id}`)}
            />
          </Tooltip>
          <Tooltip title="Download PDF">
            <Button
              type="text"
              size="small"
              icon={<DownloadOutlined />}
              onClick={() => {
                // TODO: Implement PDF download
                console.log('Download PDF:', record.id);
              }}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div className="invoices-list">
      {/* Header */}
      <Flex justify="space-between" align="center" style={{ marginBottom: 24 }}>
        <div>
          <Title level={2} style={{ margin: 0 }}>
            Invoices
          </Title>
          <Text type="secondary">Manage customer invoices and billing</Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => push('/revenue/invoices/create')}>
          Create Invoice
        </Button>
      </Flex>

      {/* Filters */}
      <Card style={{ marginBottom: 24 }}>
        <Flex gap={16} wrap="wrap">
          <Input
            placeholder="Search invoices..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 300 }}
            allowClear
          />
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            style={{ width: 200 }}
            prefix={<FilterOutlined />}
          >
            <Select.Option value="all">All Statuses</Select.Option>
            <Select.Option value="draft">Draft</Select.Option>
            <Select.Option value="sent">Sent</Select.Option>
            <Select.Option value="paid">Paid</Select.Option>
            <Select.Option value="overdue">Overdue</Select.Option>
            <Select.Option value="cancelled">Cancelled</Select.Option>
          </Select>
          <RangePicker
            value={dateRange}
            onChange={(dates) => setDateRange(dates as any)}
            format="MMM DD, YYYY"
            placeholder={['Start Date', 'End Date']}
          />
        </Flex>
      </Card>

      {/* Invoices Table */}
      <Card>
        <Table
          columns={columns}
          dataSource={invoices}
          loading={isLoading}
          rowKey="id"
          scroll={{ x: 1200 }}
          pagination={{
            current: currentPage,
            pageSize: pageSize,
            total: totalCount,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} invoices`,
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

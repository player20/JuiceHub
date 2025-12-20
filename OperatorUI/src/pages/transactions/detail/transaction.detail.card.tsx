// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import { Flex, Typography, Badge, Tag, Divider, Statistic, Row, Col } from 'antd';
import {
  ClockCircleOutlined,
  ThunderboltOutlined,
  DollarOutlined,
  UserOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import { ArrowLeftIcon } from '../../../components/icons/arrow.left.icon';
import { MenuSection } from '../../../components/main-menu/main.menu';
import { useNavigation } from '@refinedev/core';
import { useLocation } from 'react-router-dom';
import { ITransactionDto } from '@citrineos/base';

const { Text, Title } = Typography;

export interface TransactionDetailCardProps {
  transaction: ITransactionDto;
}

export const TransactionDetailCard = ({
  transaction,
}: TransactionDetailCardProps) => {
  const { goBack, push } = useNavigation();
  const pageLocation = useLocation();

  // Calculate session duration
  const getDuration = () => {
    if (!transaction.timeStart) return null;
    const start = new Date(transaction.timeStart);
    const end = transaction.timeEnd ? new Date(transaction.timeEnd) : new Date();
    const durationMs = end.getTime() - start.getTime();
    const minutes = Math.floor(durationMs / 60000);
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return hours > 0 ? `${hours}h ${remainingMinutes}m` : `${remainingMinutes}m`;
  };

  // Get status badge
  const getStatusBadge = () => {
    if (transaction.isActive) {
      return <Badge status="processing" text="Active" />;
    } else if (transaction.stopReason) {
      const isNormalStop =
        transaction.stopReason === 'EVDisconnected' ||
        transaction.stopReason === 'Normal';
      return (
        <Badge
          status={isNormalStop ? 'success' : 'error'}
          text={isNormalStop ? 'Completed' : 'Stopped'}
        />
      );
    }
    return <Badge status="default" text="Inactive" />;
  };

  // Get stop reason tag
  const getStopReasonTag = () => {
    if (!transaction.stopReason) return null;

    const isNormalStop =
      transaction.stopReason === 'EVDisconnected' ||
      transaction.stopReason === 'Normal';
    const isError =
      transaction.stopReason.includes('Error') ||
      transaction.stopReason.includes('Fault');

    let color = 'default';
    let icon = <InfoCircleOutlined />;

    if (isNormalStop) {
      color = 'success';
      icon = <CheckCircleOutlined />;
    } else if (isError) {
      color = 'error';
      icon = <CloseCircleOutlined />;
    }

    return (
      <Tag color={color} icon={icon}>
        {transaction.stopReason}
      </Tag>
    );
  };

  return (
    <Flex vertical gap={24}>
      {/* Header with back button */}
      <Flex gap={8} align="center">
        <ArrowLeftIcon
          onClick={() => {
            if (pageLocation.key === 'default') {
              push(`/${MenuSection.TRANSACTIONS}`);
            } else {
              goBack();
            }
          }}
          style={{ cursor: 'pointer' }}
        />
        <Title level={3} style={{ margin: 0 }}>
          Transaction {transaction.transactionId}
        </Title>
        {getStatusBadge()}
        {getStopReasonTag()}
      </Flex>

      <Divider style={{ margin: 0 }} />

      {/* Key Metrics Row */}
      <Row gutter={[24, 24]}>
        <Col span={6}>
          <Statistic
            title="Energy Delivered"
            value={transaction.totalKwh || 0}
            precision={2}
            suffix="kWh"
            prefix={<ThunderboltOutlined />}
          />
        </Col>
        <Col span={6}>
          <Statistic
            title="Session Duration"
            value={getDuration() || '-'}
            prefix={<ClockCircleOutlined />}
          />
        </Col>
        <Col span={6}>
          <Statistic
            title="Total Cost"
            value={transaction.totalCost || 0}
            precision={2}
            prefix={<DollarOutlined />}
          />
        </Col>
        <Col span={6}>
          <Flex vertical>
            <Text type="secondary" style={{ fontSize: 14, marginBottom: 4 }}>
              <UserOutlined /> Driver
            </Text>
            <Text strong style={{ fontSize: 16 }}>
              {transaction.idTag || '-'}
            </Text>
          </Flex>
        </Col>
      </Row>

      <Divider style={{ margin: 0 }} />

      {/* Details Grid */}
      <Row gutter={[16, 16]}>
        <Col span={8}>
          <Flex vertical gap={12}>
            <Text type="secondary">Transaction Details</Text>
            <table className="transaction-details-table">
              <tbody>
                <tr>
                  <td>
                    <Text strong>Transaction ID</Text>
                  </td>
                  <td>{transaction.transactionId}</td>
                </tr>
                <tr>
                  <td>
                    <Text strong>Station ID</Text>
                  </td>
                  <td>{transaction.stationId}</td>
                </tr>
                <tr>
                  <td>
                    <Text strong>Connector ID</Text>
                  </td>
                  <td>{transaction.evseDatabaseId || '-'}</td>
                </tr>
                <tr>
                  <td>
                    <Text strong>Charging State</Text>
                  </td>
                  <td>
                    <Tag>{transaction.chargingState || 'Unknown'}</Tag>
                  </td>
                </tr>
              </tbody>
            </table>
          </Flex>
        </Col>

        <Col span={8}>
          <Flex vertical gap={12}>
            <Text type="secondary">Session Timeline</Text>
            <table className="transaction-details-table">
              <tbody>
                <tr>
                  <td>
                    <Text strong>Start Time</Text>
                  </td>
                  <td>
                    {transaction.timeStart
                      ? new Date(transaction.timeStart).toLocaleString()
                      : '-'}
                  </td>
                </tr>
                <tr>
                  <td>
                    <Text strong>End Time</Text>
                  </td>
                  <td>
                    {transaction.timeEnd
                      ? new Date(transaction.timeEnd).toLocaleString()
                      : transaction.isActive
                      ? 'In Progress'
                      : '-'}
                  </td>
                </tr>
                <tr>
                  <td>
                    <Text strong>Created</Text>
                  </td>
                  <td>
                    {transaction.createdAt
                      ? new Date(transaction.createdAt).toLocaleString()
                      : '-'}
                  </td>
                </tr>
                <tr>
                  <td>
                    <Text strong>Last Updated</Text>
                  </td>
                  <td>
                    {transaction.updatedAt
                      ? new Date(transaction.updatedAt).toLocaleString()
                      : '-'}
                  </td>
                </tr>
              </tbody>
            </table>
          </Flex>
        </Col>

        <Col span={8}>
          <Flex vertical gap={12}>
            <Text type="secondary">Meter Values</Text>
            <table className="transaction-details-table">
              <tbody>
                <tr>
                  <td>
                    <Text strong>Meter Start</Text>
                  </td>
                  <td>
                    {transaction.meterStart
                      ? `${(transaction.meterStart / 1000).toFixed(2)} kWh`
                      : '-'}
                  </td>
                </tr>
                <tr>
                  <td>
                    <Text strong>Meter Stop</Text>
                  </td>
                  <td>
                    {transaction.meterStop
                      ? `${(transaction.meterStop / 1000).toFixed(2)} kWh`
                      : transaction.isActive
                      ? 'Ongoing'
                      : '-'}
                  </td>
                </tr>
                <tr>
                  <td>
                    <Text strong>Total Delivered</Text>
                  </td>
                  <td>
                    <Text strong>
                      {transaction.totalKwh
                        ? `${transaction.totalKwh.toFixed(2)} kWh`
                        : '-'}
                    </Text>
                  </td>
                </tr>
                {transaction.totalCost > 0 && (
                  <tr>
                    <td>
                      <Text strong>Rate</Text>
                    </td>
                    <td>
                      {transaction.totalKwh > 0
                        ? `$${(transaction.totalCost / transaction.totalKwh).toFixed(3)}/kWh`
                        : '-'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </Flex>
        </Col>
      </Row>
    </Flex>
  );
};

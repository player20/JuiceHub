// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import { Flex, Typography, Badge, Tag, Divider, Statistic, Row, Col, Card } from 'antd';
import {
  ClockCircleOutlined,
  ThunderboltOutlined,
  DollarOutlined,
  UserOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  InfoCircleOutlined,
  CarOutlined,
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
    if (!transaction.startTime) return null;
    const start = new Date(transaction.startTime);
    const end = transaction.endTime ? new Date(transaction.endTime) : new Date();
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
    } else if (transaction.stoppedReason) {
      const isNormalStop =
        transaction.stoppedReason === 'EVDisconnected' ||
        transaction.stoppedReason === 'Normal';
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
    if (!transaction.stoppedReason) return null;

    const isNormalStop =
      transaction.stoppedReason === 'EVDisconnected' ||
      transaction.stoppedReason === 'Normal';
    const isError =
      transaction.stoppedReason.includes('Error') ||
      transaction.stoppedReason.includes('Fault');

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
        {transaction.stoppedReason}
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
              {transaction.authorization?.idToken || '-'}
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
                  <td>{transaction.connectorId || '-'}</td>
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
                    {transaction.startTime
                      ? new Date(transaction.startTime).toLocaleString()
                      : '-'}
                  </td>
                </tr>
                <tr>
                  <td>
                    <Text strong>End Time</Text>
                  </td>
                  <td>
                    {transaction.endTime
                      ? new Date(transaction.endTime).toLocaleString()
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
                    {transaction.startTransaction?.meterStart
                      ? `${(transaction.startTransaction.meterStart / 1000).toFixed(2)} kWh`
                      : '-'}
                  </td>
                </tr>
                <tr>
                  <td>
                    <Text strong>Meter Stop</Text>
                  </td>
                  <td>
                    {transaction.stopTransaction?.meterStop
                      ? `${(transaction.stopTransaction.meterStop / 1000).toFixed(2)} kWh`
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
                {transaction.totalCost != null && transaction.totalCost > 0 && (
                  <tr>
                    <td>
                      <Text strong>Rate</Text>
                    </td>
                    <td>
                      {transaction.totalKwh != null && transaction.totalKwh > 0
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

      {/* Session Summary / Receipt */}
      {transaction.totalKwh != null && transaction.totalKwh > 0 && (
        <>
          <Divider style={{ margin: 0 }} />
          <Text type="secondary">Session Summary</Text>
          <Row gutter={16}>
            <Col xs={24} sm={8}>
              <Card size="small" style={{ background: '#fff7e6' }}>
                <Statistic
                  title="Estimated Range Added"
                  value={(transaction.totalKwh * 3.5).toFixed(1)}
                  suffix="miles"
                  prefix={<CarOutlined />}
                  valueStyle={{ color: '#fa8c16' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card size="small" style={{ background: '#f0f5ff' }}>
                <Statistic
                  title="Estimated Cost (@ $0.30/kWh)"
                  value={(transaction.totalKwh * 0.30).toFixed(2)}
                  prefix={<DollarOutlined />}
                  precision={2}
                />
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card size="small" style={{ background: '#f6ffed' }}>
                <Statistic
                  title="CO₂ Avoided (vs. 25 mpg Gas Car)"
                  value={(() => {
                    const milesPerKwh = 3.5;
                    const milesDriven = transaction.totalKwh! * milesPerKwh;
                    const gasolineEmissions = (milesDriven / 25) * 8.89;
                    const evEmissions = transaction.totalKwh! * 0.5;
                    return (gasolineEmissions - evEmissions).toFixed(2);
                  })()}
                  suffix="kg"
                  valueStyle={{ color: '#52c41a' }}
                />
              </Card>
            </Col>
          </Row>
        </>
      )}
    </Flex>
  );
};

// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import React, { FC, useEffect, useState } from 'react';
import { Card, Descriptions, Statistic, Row, Col, Typography, Spin, Tag, Divider, Empty } from 'antd';
import { useSubscription, useList } from '@refinedev/core';
import { getPlainToInstanceOptions } from '@util/tables';
import { TransactionDto } from '../../../dtos/transaction.dto';
import { MeterValueDto } from '../../../dtos/meter.value.dto';
import { ResourceType } from '@util/auth';
import { GET_TRANSACTION_LIST_FOR_STATION, GET_METER_VALUES_FOR_STATION } from '../../../message/queries';
import { ITransactionDto, IMeterValueDto } from '@citrineos/base';
import { ThunderboltOutlined, FireOutlined, DashboardOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(duration);
dayjs.extend(relativeTime);

const { Text, Title } = Typography;

interface ConnectorStatsProps {
  stationId: string;
}

interface ParsedMeterValue {
  measurand: string;
  value: number;
  unit: string;
  timestamp: string;
}

const parseSampledValues = (sampledValue: any[]): ParsedMeterValue[] => {
  if (!sampledValue || !Array.isArray(sampledValue)) return [];

  return sampledValue.map((sv: any) => ({
    measurand: sv.measurand || 'Unknown',
    value: parseFloat(sv.value) || 0,
    unit: sv.unit || '',
    timestamp: sv.timestamp || '',
  }));
};

const formatDuration = (seconds: number): string => {
  const dur = dayjs.duration(seconds, 'seconds');
  const hours = Math.floor(dur.asHours());
  const minutes = dur.minutes();

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
};

export const ChargingStationLiveStats: FC<ConnectorStatsProps> = ({ stationId }) => {
  const [refreshKey, setRefreshKey] = useState(0);

  // Get active transactions
  const { data: txData, isLoading: txLoading, refetch: refetchTx } = useList<ITransactionDto>({
    resource: ResourceType.TRANSACTIONS,
    filters: [
      { field: 'stationId', operator: 'eq', value: stationId },
      { field: 'isActive', operator: 'eq', value: true },
    ],
    meta: {
      gqlQuery: GET_TRANSACTION_LIST_FOR_STATION,
      gqlVariables: { stationId, limit: 100, offset: 0 },
    },
    queryOptions: getPlainToInstanceOptions(TransactionDto, true),
  });

  const activeTxs = txData?.data || [];
  const txIds = activeTxs.map((tx) => tx.id);

  // Get latest meter values for active transactions
  const { data: mvData, isLoading: mvLoading, refetch: refetchMv } = useList<IMeterValueDto>({
    resource: ResourceType.METER_VALUES,
    meta: {
      gqlQuery: GET_METER_VALUES_FOR_STATION,
      gqlVariables: {
        transactionDatabaseIds: txIds,
        limit: 20,
        offset: 0,
        order_by: { timestamp: 'desc' },
      },
    },
    queryOptions: {
      ...getPlainToInstanceOptions(MeterValueDto, true),
      enabled: txIds.length > 0,
    },
  });

  const latestMeterValues = mvData?.data || [];

  // Auto-refresh every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refetchTx();
      refetchMv();
      setRefreshKey(prev => prev + 1);
    }, 10000);

    return () => clearInterval(interval);
  }, [refetchTx, refetchMv]);

  if (txLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
        <Spin size="large" tip="Loading live stats..." />
      </div>
    );
  }

  if (activeTxs.length === 0) {
    return (
      <Card>
        <Empty
          description={
            <div>
              <Text type="secondary">No active charging sessions</Text>
              <br />
              <Text type="secondary" style={{ fontSize: 12 }}>
                Stats will appear when a vehicle starts charging
              </Text>
            </div>
          }
        />
      </Card>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {activeTxs.map((tx) => {
        const txMeterValues = latestMeterValues.filter(
          (mv) => mv.transactionDatabaseId === tx.id
        );

        // Get latest meter value (array is already sorted desc)
        const latestMv = txMeterValues[0];
        const parsedValues = latestMv ? parseSampledValues(latestMv.sampledValue as any[]) : [];

        // Extract specific measurands from latest reading
        const energyRaw = parsedValues.find((v) => v.measurand.includes('Energy.Active.Import'));
        const power = parsedValues.find((v) => v.measurand.includes('Power.Active.Import'));
        const voltage = parsedValues.find((v) => v.measurand.includes('Voltage'));
        const current = parsedValues.find((v) => v.measurand.includes('Current.Import'));
        const soc = parsedValues.find((v) => v.measurand === 'SoC');
        const temperature = parsedValues.find((v) => v.measurand.includes('Temperature'));

        // Use transaction's meterStart (set during StartTransaction)
        // This is the actual meter reading when the session began
        const meterStart = tx.meterStart || 0;

        // Calculate session-specific energy (current meter reading - starting meter reading)
        const currentMeterReading = energyRaw ? energyRaw.value : 0;
        const sessionEnergyWh = currentMeterReading - meterStart;
        const sessionEnergyKwh = sessionEnergyWh / 1000;

        // Use transaction's actual start time (set during StartTransaction)
        const sessionStartTime = tx.startTime;
        const sessionAge = sessionStartTime ? dayjs().diff(dayjs(sessionStartTime), 'seconds') : 0;

        return (
          <Card
            key={tx.id}
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <Title level={4} style={{ margin: 0 }}>
                  Connector {tx.connectorId || 'Unknown'}
                </Title>
                <Tag color="green">CHARGING</Tag>
                <Text type="secondary" style={{ fontSize: 14 }}>
                  Session ID: {tx.transactionId}
                </Text>
              </div>
            }
            extra={
              <Text type="secondary">
                Auto-refreshing • Last update: {dayjs().format('HH:mm:ss')}
              </Text>
            }
          >
            {/* Key Metrics Row */}
            <Row gutter={[24, 24]}>
              <Col xs={24} sm={12} md={6}>
                <Statistic
                  title="Energy Delivered"
                  value={sessionEnergyKwh.toFixed(2)}
                  suffix="kWh"
                  prefix={<ThunderboltOutlined />}
                  valueStyle={{ color: '#3f8600' }}
                />
              </Col>

              {power && (
                <Col xs={24} sm={12} md={6}>
                  <Statistic
                    title="Current Power"
                    value={(power.value / 1000).toFixed(2)}
                    suffix="kW"
                    prefix={<ThunderboltOutlined />}
                    valueStyle={{ color: '#1890ff' }}
                  />
                </Col>
              )}

              <Col xs={24} sm={12} md={6}>
                <Statistic
                  title="Session Duration"
                  value={formatDuration(sessionAge)}
                  prefix={<DashboardOutlined />}
                />
              </Col>

              {soc && (
                <Col xs={24} sm={12} md={6}>
                  <Statistic
                    title="Battery Level"
                    value={soc.value.toFixed(0)}
                    suffix="%"
                    valueStyle={{ color: '#52c41a' }}
                  />
                </Col>
              )}
            </Row>

            <Divider />

            {/* Detailed Metrics */}
            <Descriptions
              title="Detailed Metrics"
              column={{ xs: 1, sm: 2, md: 3 }}
              size="small"
            >
              <Descriptions.Item label="Session Start">
                {sessionStartTime ? dayjs(sessionStartTime).format('MMM D, YYYY HH:mm:ss') : 'N/A'}
              </Descriptions.Item>

              <Descriptions.Item label="Authorization">
                <Tag>{tx.authorization?.idToken || 'auto-host-charging'}</Tag>
              </Descriptions.Item>

              <Descriptions.Item label="Charging State">
                <Tag color="processing">{tx.chargingState || 'Charging'}</Tag>
              </Descriptions.Item>

              {voltage && (
                <Descriptions.Item label="Voltage">
                  {voltage.value.toFixed(1)} {voltage.unit}
                </Descriptions.Item>
              )}

              {current && (
                <Descriptions.Item label="Current">
                  {current.value.toFixed(1)} {current.unit}
                </Descriptions.Item>
              )}

              {temperature && (
                <Descriptions.Item label="Charger Temperature">
                  <span>
                    <FireOutlined /> {temperature.value.toFixed(1)} {temperature.unit}
                  </span>
                </Descriptions.Item>
              )}

              {power && energyRaw && (
                <Descriptions.Item label="Avg Power">
                  {sessionAge > 0
                    ? (sessionEnergyKwh / (sessionAge / 3600)).toFixed(2)
                    : '0.00'}{' '}
                  kW
                </Descriptions.Item>
              )}

              <Descriptions.Item label="Meter Values Received">
                {txMeterValues.length}
              </Descriptions.Item>

              <Descriptions.Item label="Last Data Update">
                {latestMv
                  ? dayjs(latestMv.timestamp).fromNow()
                  : 'No data yet'}
              </Descriptions.Item>
            </Descriptions>

            {/* All Available Measurands */}
            {parsedValues.length > 0 && (
              <>
                <Divider />
                <div>
                  <Text strong>All Available Data Points:</Text>
                  <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
                    {parsedValues.map((pv, idx) => (
                      <Col xs={12} sm={8} md={6} key={idx}>
                        <Card size="small">
                          <Statistic
                            title={pv.measurand}
                            value={pv.value.toFixed(2)}
                            suffix={pv.unit}
                            valueStyle={{ fontSize: 16 }}
                          />
                        </Card>
                      </Col>
                    ))}
                  </Row>
                </div>
              </>
            )}

            {/* Cost and Environmental Impact */}
            {energyRaw && (
              <>
                <Divider />
                <Row gutter={16}>
                  <Col xs={24} sm={12}>
                    <Card size="small" style={{ background: '#f0f5ff' }}>
                      <Statistic
                        title="Estimated Cost (@ $0.30/kWh)"
                        value={(sessionEnergyKwh * 0.30).toFixed(2)}
                        prefix="$"
                        precision={2}
                      />
                    </Card>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Card size="small" style={{ background: '#f6ffed' }}>
                      <Statistic
                        title="CO₂ Avoided (vs. 25 mpg Gas Car)"
                        value={(() => {
                          // EV efficiency: ~3.5 miles/kWh (typical for modern EVs)
                          const milesPerKwh = 3.5;
                          const milesDriven = sessionEnergyKwh * milesPerKwh;

                          // Gas vehicle: 25 mpg average, 8.89 kg CO2 per gallon
                          const gasolineEmissions = (milesDriven / 25) * 8.89;

                          // Grid emissions: ~0.5 kg CO2/kWh (US average)
                          const evEmissions = sessionEnergyKwh * 0.5;

                          // Net CO2 savings
                          const co2Savings = gasolineEmissions - evEmissions;
                          return co2Savings.toFixed(2);
                        })()}
                        suffix="kg"
                        valueStyle={{ color: '#52c41a' }}
                      />
                    </Card>
                  </Col>
                </Row>
              </>
            )}
          </Card>
        );
      })}
    </div>
  );
};

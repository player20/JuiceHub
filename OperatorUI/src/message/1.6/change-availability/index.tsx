// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { Form, Select, Button, message, Spin } from 'antd';
import { useCustom } from '@refinedev/core';
import { MessageConfirmation } from '../../MessageConfirmation';
import { ChargingStation } from '../../../pages/charging-stations/ChargingStation';
import { triggerMessageAndHandleResponse } from '../../util';
import { ChangeAvailabilityRequestType } from '@OCPP1_6';
import * as base from '@citrineos/base';
import { CONNECTOR_LIST_FOR_STATION_QUERY } from '../../queries';

export interface ChangeAvailabilityProps {
  station: ChargingStation;
}

interface ChangeAvailabilityFormData {
  connectorId: number;
  type: ChangeAvailabilityRequestType;
}

export const ChangeAvailability: React.FC<ChangeAvailabilityProps> = ({
  station,
}) => {
  const [form] = Form.useForm<ChangeAvailabilityFormData>();
  const [loading, setLoading] = React.useState(false);

  // Fetch connectors for this station
  const { data: connectorsData, isLoading: connectorsLoading } = useCustom({
    url: '',
    method: 'post',
    config: { headers: { 'Content-Type': 'application/json' } },
    meta: {
      operation: 'GetPaginatedConnectorListForStation',
      gqlQuery: CONNECTOR_LIST_FOR_STATION_QUERY,
      gqlVariables: {
        stationId: station.id,
        offset: 0,
        limit: 100,
      },
    },
  });

  const connectors = connectorsData?.data?.Connectors || [];

  const handleSubmit = async (values: ChangeAvailabilityFormData) => {
    if (values.connectorId === undefined || values.connectorId === null) {
      message.error('Please select a connector');
      return;
    }

    const data = {
      connectorId: values.connectorId,
      type: values.type,
    };

    console.log('Sending ChangeAvailability:', data);

    try {
      setLoading(true);
      await triggerMessageAndHandleResponse<MessageConfirmation[]>({
        url: `/configuration/changeAvailability?identifier=${station.id}&tenantId=1`,
        data,
        ocppVersion: base.OCPPVersion.OCPP1_6,
      });
      message.success('ChangeAvailability command sent successfully');
      form.resetFields();
    } catch (error) {
      console.error('ChangeAvailability error:', error);
      message.error('Failed to send ChangeAvailability command');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleSubmit}
      style={{ maxWidth: 600 }}
    >
      <Form.Item
        label="Connector"
        name="connectorId"
        rules={[{ required: true, message: 'Please select a connector' }]}
      >
        <Select
          placeholder="Select a connector"
          loading={connectorsLoading}
          disabled={connectorsLoading}
        >
          {connectors.map((connector: any) => (
            <Select.Option key={connector.id} value={connector.connectorId}>
              Connector {connector.connectorId}
              {connector.connectorId === 0 && ' (Whole Station)'}
              {connector.type && ` - ${connector.type}`}
            </Select.Option>
          ))}
        </Select>
      </Form.Item>

      <Form.Item
        label="Type"
        name="type"
        rules={[{ required: true, message: 'Please select a type' }]}
      >
        <Select placeholder="Select availability type">
          <Select.Option value={ChangeAvailabilityRequestType.Operative}>
            Operative
          </Select.Option>
          <Select.Option value={ChangeAvailabilityRequestType.Inoperative}>
            Inoperative
          </Select.Option>
        </Select>
      </Form.Item>

      <Form.Item>
        <Button type="primary" htmlType="submit" loading={loading}>
          Submit
        </Button>
      </Form.Item>
    </Form>
  );
};

// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { Route, Routes } from 'react-router-dom';
import { RevenueDashboard } from './dashboard/revenue.dashboard';
import { InvoicesList } from './invoices/invoices.list';
import { InvoiceDetail } from './invoices/invoice.detail';
import { PaymentsList } from './payments/payments.list';
import { BillingSettings } from './settings/billing.settings';
import { DollarOutlined } from '@ant-design/icons';

export const routes: React.FC = () => {
  return (
    <Routes>
      <Route index element={<RevenueDashboard />} />
      <Route path="invoices" element={<InvoicesList />} />
      <Route path="invoices/:id" element={<InvoiceDetail />} />
      <Route path="payments" element={<PaymentsList />} />
      <Route path="settings" element={<BillingSettings />} />
    </Routes>
  );
};

export const resources = [
  {
    name: 'revenue',
    list: '/revenue',
    meta: {
      label: 'Revenue',
    },
    icon: <DollarOutlined />,
  },
];

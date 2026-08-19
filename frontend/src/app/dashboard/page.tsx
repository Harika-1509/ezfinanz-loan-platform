'use client';

import React from 'react';
import { CustomerRoute } from '../../components/auth/route-guards';
import { CustomerDashboard } from '../../components/loan/customer-dashboard';

export default function DashboardPage() {
  return (
    <CustomerRoute>
      <CustomerDashboard />
    </CustomerRoute>
  );
}

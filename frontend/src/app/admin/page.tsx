'use client';

import React from 'react';
import { AdminRoute } from '../../components/auth/route-guards';
import { AdminDashboard } from '../../components/admin/admin-dashboard';

export default function AdminPortalPage() {
  return (
    <AdminRoute>
      <AdminDashboard />
    </AdminRoute>
  );
}

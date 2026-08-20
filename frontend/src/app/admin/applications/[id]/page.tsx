'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { AdminRoute } from '@/components/auth/route-guards';
import { AdminApplicationDetail } from '@/components/admin/admin-application-detail';

export const dynamic = 'force-dynamic';

export default function AdminApplicationDetailPage() {
  const params = useParams();
  const id = (params?.id as string) || '';

  return (
    <AdminRoute>
      <AdminApplicationDetail applicationId={id} />
    </AdminRoute>
  );
}

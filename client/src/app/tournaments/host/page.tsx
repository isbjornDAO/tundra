// Server component that can handle revalidate
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import AdminClient from './admin-client';

export default function AdminPage() {
  return <AdminClient />;
}
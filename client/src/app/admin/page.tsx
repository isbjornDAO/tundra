export const dynamic = 'force-dynamic';
export const revalidate = 0;

import GeneralAdminClient from './general/general-admin-client';

export default function AdminPage() {
  return <GeneralAdminClient />;
}
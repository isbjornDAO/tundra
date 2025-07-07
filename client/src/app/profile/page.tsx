// Server component that can handle revalidate
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import ProfileClient from './profile-client';

export default function Profile() {
  return <ProfileClient />;
}
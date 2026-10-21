import type { Metadata } from 'next';
import { ProfilePage } from '@/components/account/account-pages';

export const metadata: Metadata = { title: 'Profile & security', robots: { index: false } };

export default function Page() {
  return <ProfilePage />;
}

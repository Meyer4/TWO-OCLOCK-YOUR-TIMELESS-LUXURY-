import type { Metadata } from 'next';
import { AccountOverview } from '@/components/account/account-pages';

export const metadata: Metadata = { title: 'Your account', robots: { index: false } };

export default function AccountPage() {
  return <AccountOverview />;
}

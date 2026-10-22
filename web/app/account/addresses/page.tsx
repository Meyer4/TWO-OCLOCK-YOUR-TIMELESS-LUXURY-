import type { Metadata } from 'next';
import { AddressesPage } from '@/components/account/account-pages';

export const metadata: Metadata = { title: 'Addresses', robots: { index: false } };

export default function Page() {
  return <AddressesPage />;
}

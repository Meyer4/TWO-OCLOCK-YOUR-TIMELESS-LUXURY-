import type { Metadata } from 'next';
import { OrdersPage } from '@/components/account/account-pages';

export const metadata: Metadata = { title: 'Your orders', robots: { index: false } };

export default function Page() {
  return <OrdersPage />;
}

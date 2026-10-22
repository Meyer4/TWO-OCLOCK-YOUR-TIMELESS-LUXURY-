import { DEMO } from '@/lib/demo/mode';
import type { Metadata } from 'next';
import { Suspense } from 'react';
import { OrderDetail } from '@/components/orders/order-detail';

export const metadata: Metadata = { title: 'Order details', robots: { index: false } };

/** Order pages are per-customer and never pre-rendered. Static demo export needs one placeholder route. */
export function generateStaticParams() {
  return DEMO ? [{ id: 'demo' }] : [];
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Suspense fallback={null}>
      <OrderDetail orderId={id} />
    </Suspense>
  );
}

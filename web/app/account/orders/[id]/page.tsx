import type { Metadata } from 'next';
import { Suspense } from 'react';
import { OrderDetail } from '@/components/orders/order-detail';

export const metadata: Metadata = { title: 'Order details', robots: { index: false } };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Suspense fallback={null}>
      <OrderDetail orderId={id} />
    </Suspense>
  );
}

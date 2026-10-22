'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/field';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAdminOrders, useConfirmPayment, useOrderStatus, useRefund } from '@/hooks/use-admin';
import { useMe } from '@/hooks/use-auth';
import { ApiError } from '@/lib/api';
import { formatDateTime, formatMWK, ORDER_STATUS_LABELS, PAYMENT_LABELS } from '@/lib/format';
import { toast } from '@/store/toast';
import type { Order } from '@/lib/types';
import { AdminHeader, Td, Th, TableShell } from './admin-shell';

const NEXT_STATUS: Record<string, string[]> = {
  paid: ['processing'],
  processing: ['packing'],
  packing: ['shipped'],
  shipped: ['delivered'],
};

export function AdminOrders() {
  const me = useMe();
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const orders = useAdminOrders({ status: status || undefined, q: search || undefined, page });
  const [open, setOpen] = useState<string | null>(null);
  const isSuper = me.data?.role === 'super_admin';

  return (
    <div className="space-y-8">
      <AdminHeader eyebrow="Fulfilment" title="Orders" />
      <form
        className="flex flex-wrap items-end gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          setSearch(q.trim());
        }}
      >
        <Select aria-label="Filter by status" className="w-52 py-2" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All statuses</option>
          {Object.entries(ORDER_STATUS_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </Select>
        <Input aria-label="Search orders" className="w-64" placeholder="Order number, name or phone" value={q} onChange={(e) => setQ(e.target.value)} />
        <Button type="submit" variant="outline" size="sm">Search</Button>
      </form>

      {orders.isLoading ? <Skeleton className="h-64 w-full" /> : null}
      {orders.data ? (
        <TableShell>
          <thead>
            <tr><Th>Order</Th><Th>Customer</Th><Th>Placed</Th><Th>Status</Th><Th>Payment</Th><Th className="text-right">Total</Th><Th /></tr>
          </thead>
          <tbody>
            {orders.data.items.map((o) => (
              <OrderRows key={o._id} order={o} expanded={open === o._id} isSuper={isSuper} onToggle={() => setOpen(open === o._id ? null : o._id)} />
            ))}
          </tbody>
        </TableShell>
      ) : null}
      {orders.data && orders.data.items.length === 0 ? <p className="text-sm text-stone">No orders match these filters.</p> : null}

      {orders.data && orders.data.pages > 1 ? (
        <div className="flex items-center gap-4 text-sm">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
          <span className="text-stone">Page {page} of {orders.data.pages}</span>
          <Button variant="outline" size="sm" disabled={page >= orders.data.pages} onClick={() => setPage(page + 1)}>Next</Button>
        </div>
      ) : null}
    </div>
  );
}

function OrderRows({ order: o, expanded, isSuper, onToggle }: { order: Order; expanded: boolean; isSuper: boolean; onToggle: () => void }) {
  return (
    <>
      <tr className="cursor-pointer hover:bg-ink-soft/50" onClick={onToggle}>
        <Td className="font-display text-ivory">{o.orderNumber}</Td>
        <Td>{o.customer.name}<span className="block text-xs text-stone">{o.customer.phone ?? o.customer.email}</span></Td>
        <Td className="whitespace-nowrap text-xs">{formatDateTime(o.createdAt)}</Td>
        <Td><Badge tone={o.status === 'cancelled' || o.status === 'refunded' ? 'danger' : 'muted'}>{ORDER_STATUS_LABELS[o.status]}</Badge></Td>
        <Td className="text-xs capitalize">{PAYMENT_LABELS[o.paymentProvider ?? ''] ?? '—'}<span className="block text-stone">{o.paymentStatus}</span></Td>
        <Td className="text-right">{formatMWK(o.total)}</Td>
        <Td className="text-right text-xs text-gold">{expanded ? 'Close' : 'Manage'}</Td>
      </tr>
      {expanded ? (
        <tr>
          <td colSpan={7} className="border-b border-ink-line bg-ink-soft/30 p-6">
            <OrderActions order={o} isSuper={isSuper} />
          </td>
        </tr>
      ) : null}
    </>
  );
}

function OrderActions({ order: o, isSuper }: { order: Order; isSuper: boolean }) {
  const setStatus = useOrderStatus();
  const confirm = useConfirmPayment();
  const refund = useRefund();
  const [target, setTarget] = useState('');
  const [tracking, setTracking] = useState(o.trackingNumber ?? '');
  const [courier, setCourier] = useState(o.courier ?? '');
  const [reason, setReason] = useState('');
  const options = NEXT_STATUS[o.status] ?? [];
  const fail = (err: unknown) => toast.error(err instanceof ApiError ? err.message : 'That action could not be completed.');

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_1fr]">
      <div className="space-y-4 text-sm">
        <p className="eyebrow">Items</p>
        <ul className="space-y-2">
          {o.items.map((i, idx) => (
            <li key={idx} className="flex justify-between gap-4">
              <span>{i.name} <span className="text-stone">{[i.size, i.color, `× ${i.quantity}`].filter(Boolean).join(' · ')}</span></span>
              <span>{formatMWK(i.unitPrice * i.quantity)}</span>
            </li>
          ))}
        </ul>
        <p className="text-stone">Ship to: {o.shippingAddress.recipientName}, {o.shippingAddress.street}, {o.shippingAddress.district}, {o.shippingAddress.city} · {o.shippingAddress.phone}</p>
        {o.customer.phone ? <p className="text-stone">Customer phone: {o.customer.phone}</p> : null}
      </div>

      <div className="space-y-6">
        {o.paymentStatus !== 'paid' && (o.status === 'pending' || o.status === 'awaiting_payment') ? (
          <div className="flex items-center justify-between gap-4 border border-ink-line p-4 text-sm">
            <span className="text-stone">Mark as paid after a manual transfer or WhatsApp confirmation.</span>
            <Button size="sm" variant="outline" disabled={confirm.isPending} onClick={() => confirm.mutate(o._id, { onSuccess: () => toast.success('Payment confirmed.'), onError: fail })}>Confirm payment</Button>
          </div>
        ) : null}

        {options.length > 0 ? (
          <div className="space-y-4 border border-ink-line p-4">
            <p className="eyebrow">Advance status</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Select aria-label="Next status" className="py-2" value={target} onChange={(e) => setTarget(e.target.value)}>
                <option value="">Choose next status</option>
                {options.map((s) => (
                  <option key={s} value={s}>{ORDER_STATUS_LABELS[s]}</option>
                ))}
              </Select>
              {target === 'shipped' ? (
                <>
                  <Input aria-label="Courier" placeholder="Courier" value={courier} onChange={(e) => setCourier(e.target.value)} />
                  <Input aria-label="Tracking number" placeholder="Tracking number" value={tracking} onChange={(e) => setTracking(e.target.value)} />
                </>
              ) : null}
            </div>
            <Button
              size="sm"
              disabled={!target || setStatus.isPending}
              onClick={() =>
                setStatus.mutate(
                  { id: o._id, status: target, trackingNumber: tracking || undefined, courier: courier || undefined },
                  { onSuccess: () => { toast.success(`Order moved to ${ORDER_STATUS_LABELS[target]}.`); setTarget(''); }, onError: fail },
                )
              }
            >
              Update status
            </Button>
          </div>
        ) : null}

        {isSuper && o.paymentStatus === 'paid' && o.status !== 'refunded' ? (
          <div className="space-y-3 border border-danger/40 p-4">
            <p className="eyebrow text-danger">Refund</p>
            <Input aria-label="Refund reason" placeholder="Reason (required)" value={reason} onChange={(e) => setReason(e.target.value)} />
            <Button size="sm" variant="danger" disabled={reason.trim().length < 3 || refund.isPending} onClick={() => refund.mutate({ id: o._id, reason: reason.trim() }, { onSuccess: () => toast.info('Refund issued.'), onError: fail })}>
              Refund order
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

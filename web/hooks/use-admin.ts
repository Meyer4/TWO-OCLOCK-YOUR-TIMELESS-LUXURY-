'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, qs } from '@/lib/api';
import type { Coupon, Order, Paginated, Product, Review } from '@/lib/types';

export function useAdminDashboard() {
  return useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: () =>
      api<{ pendingFulfilment: number; awaitingPayment: number; lowStock: number; customers: number; todayRevenue: number }>(
        '/admin/dashboard',
      ),
  });
}

export type Period = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface AnalyticsResponse {
  series: Array<{ label: string; revenue: number; orders: number }>;
  totals: { revenue: number; orders: number; averageOrderValue: number; newCustomers: number; conversionRate: number };
  bestSellers: Array<{ _id: string; name: string; units: number; revenue: number }>;
  statusBreakdown: Record<string, number>;
}

export function useAdminAnalytics(period: Period) {
  return useQuery({
    queryKey: ['admin', 'analytics', period],
    queryFn: () => api<AnalyticsResponse>(`/admin/analytics${qs({ period })}`),
  });
}

export function useAdminOrders(filters: { status?: string; q?: string; page: number }) {
  return useQuery({
    queryKey: ['admin', 'orders', filters],
    queryFn: () => api<Paginated<Order>>(`/admin/orders${qs({ ...filters, limit: 25 })}`),
    placeholderData: keepPreviousData,
  });
}

export function useAdminProducts(q: string, page: number) {
  return useQuery({
    queryKey: ['admin', 'products', q, page],
    queryFn: () => api<Paginated<Product>>(`/products/manage/list${qs({ q, page, limit: 20 })}`),
    placeholderData: keepPreviousData,
  });
}

export function useSaveProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { id?: string; body: Record<string, unknown> }) =>
      input.id
        ? api(`/products/${input.id}`, { method: 'PATCH', body: input.body })
        : api('/products', { method: 'POST', body: input.body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin'] }),
  });
}

export function useArchiveProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api(`/products/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'products'] }),
  });
}

export function useUpdateStock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, stock }: { id: string; stock: number }) =>
      api(`/products/${id}/stock`, { method: 'PATCH', body: { stock } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin'] }),
  });
}

export function useOrderStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; status: string; trackingNumber?: string; courier?: string; note?: string }) =>
      api(`/admin/orders/${input.id}/status`, {
        method: 'PATCH',
        body: { status: input.status, trackingNumber: input.trackingNumber, courier: input.courier, note: input.note },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'orders'] }),
  });
}

export function useConfirmPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api(`/admin/orders/${id}/confirm-payment`, { method: 'POST', body: {} }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'orders'] }),
  });
}

export function useRefund() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; reason: string }) =>
      api(`/admin/orders/${input.id}/refund`, { method: 'POST', body: { reason: input.reason } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'orders'] }),
  });
}

export function useAdminReviews(status: string) {
  return useQuery({
    queryKey: ['admin', 'reviews', status],
    queryFn: () => api<Paginated<Review & { product?: { name: string } }>>(`/admin/reviews${qs({ status, limit: 50 })}`),
  });
}

export function useModerateReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; status: 'approved' | 'rejected' }) =>
      api(`/admin/reviews/${input.id}`, { method: 'PATCH', body: { status: input.status } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'reviews'] }),
  });
}

export function useAdminCoupons() {
  return useQuery({
    queryKey: ['admin', 'coupons'],
    queryFn: async () => (await api<{ items: Coupon[] }>('/coupons')).items,
  });
}

export function useSaveCoupon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { id?: string; body: Record<string, unknown> }) =>
      input.id
        ? api(`/coupons/${input.id}`, { method: 'PATCH', body: input.body })
        : api('/coupons', { method: 'POST', body: input.body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'coupons'] }),
  });
}

export function useDeactivateCoupon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api(`/coupons/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'coupons'] }),
  });
}

export function useInventory() {
  return useQuery({
    queryKey: ['admin', 'inventory'],
    queryFn: () =>
      api<{ threshold: number; lowStock: number; items: Array<Product & { reservedStock: number; soldCount: number; isLow: boolean }> }>(
        '/admin/inventory',
      ),
  });
}

export function useAdminCustomers(q: string, page: number) {
  return useQuery({
    queryKey: ['admin', 'customers', q, page],
    queryFn: () =>
      api<Paginated<{ _id: string; name: string; email: string; phone?: string; points: number; createdAt: string }>>(
        `/admin/customers${qs({ q, page, limit: 25 })}`,
      ),
    placeholderData: keepPreviousData,
  });
}

export function useUploadSignature() {
  return useMutation({
    mutationFn: (folder: 'products' | 'reviews' | 'blog' | 'marketing') =>
      api<{ cloudName: string; apiKey: string; timestamp: number; folder: string; signature: string }>(
        `/admin/uploads/signature${qs({ folder })}`,
        { method: 'POST' },
      ),
  });
}

/** Uploads a file directly to Cloudinary using a server-issued signature. */
export async function uploadToCloudinary(file: File, folder: 'products' | 'reviews' | 'blog' | 'marketing', sign: (f: typeof folder) => Promise<{ cloudName: string; apiKey: string; timestamp: number; folder: string; signature: string }>): Promise<string> {
  const params = await sign(folder);
  const form = new FormData();
  form.append('file', file);
  form.append('api_key', params.apiKey);
  form.append('timestamp', String(params.timestamp));
  form.append('folder', params.folder);
  form.append('signature', params.signature);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${params.cloudName}/image/upload`, { method: 'POST', body: form });
  const data = (await res.json()) as { secure_url?: string; error?: { message: string } };
  if (!res.ok || !data.secure_url) throw new Error(data.error?.message ?? 'Upload failed');
  return data.secure_url;
}

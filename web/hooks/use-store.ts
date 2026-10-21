'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, qs } from '@/lib/api';
import type { Category, Coupon, Order, Paginated, PaymentMethod, Product, Review, StoreSettings } from '@/lib/types';

export interface ProductFilters {
  q?: string;
  category?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  inStock?: boolean;
  size?: string;
  color?: string;
  sort?: string;
  page?: number;
  limit?: number;
}

export interface ProductListResponse extends Paginated<Product> {
  fuzzy: boolean;
}

export function useProducts(filters: ProductFilters) {
  return useQuery({
    queryKey: ['products', 'list', filters],
    queryFn: () => api<ProductListResponse>(`/products${qs({ ...filters })}`),
    placeholderData: keepPreviousData,
  });
}

export function useFacets(filters: Pick<ProductFilters, 'category' | 'brand' | 'q'>) {
  return useQuery({
    queryKey: ['products', 'facets', filters],
    queryFn: () =>
      api<{ brands: string[]; sizes: string[]; colors: string[]; priceRange: { min: number; max: number } }>(
        `/products/facets${qs({ ...filters })}`,
      ),
  });
}

export function useProductSuggestions(q: string) {
  return useQuery({
    queryKey: ['products', 'suggest', q],
    queryFn: () =>
      api<{ products: Array<Pick<Product, '_id' | 'name' | 'slug' | 'brand' | 'images' | 'price' | 'salePrice'>>; brands: string[] }>(
        `/products/suggest${qs({ q })}`,
      ),
    enabled: q.trim().length >= 2,
    staleTime: 30_000,
  });
}

export function useProduct(slug: string) {
  return useQuery({
    queryKey: ['products', 'detail', slug],
    queryFn: async () => (await api<{ item: Product }>(`/products/${encodeURIComponent(slug)}`)).item,
    enabled: Boolean(slug),
  });
}

export function useRelated(slug: string) {
  return useQuery({
    queryKey: ['products', 'related', slug],
    queryFn: () => api<{ related: Product[]; similar: Product[] }>(`/products/${encodeURIComponent(slug)}/related`),
    enabled: Boolean(slug),
  });
}

export function useProductsByIds(ids: string[]) {
  return useQuery({
    queryKey: ['products', 'by-ids', ids],
    queryFn: async () => (await api<{ items: Product[] }>(`/products/by-ids${qs({ ids: ids.join(',') })}`)).items,
    enabled: ids.length > 0,
    staleTime: 60_000,
  });
}

export function useCurated(kind: 'featured' | 'trending', category?: string, limit = 8) {
  return useQuery({
    queryKey: ['products', kind, category ?? 'all', limit],
    queryFn: async () => (await api<{ items: Product[] }>(`/products/${kind}${qs({ category, limit })}`)).items,
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => (await api<{ items: Category[] }>('/categories')).items,
    staleTime: 5 * 60_000,
  });
}

export function useStoreSettings() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: () => api<StoreSettings>('/settings'),
    staleTime: 5 * 60_000,
  });
}

export function usePaymentMethods() {
  return useQuery({
    queryKey: ['payments', 'methods'],
    queryFn: async () => (await api<{ methods: PaymentMethod[] }>('/payments/methods')).methods,
    staleTime: 5 * 60_000,
  });
}

export function useReviews(productId: string | undefined, page = 1) {
  return useQuery({
    queryKey: ['reviews', productId, page],
    queryFn: () =>
      api<{ items: Review[]; total: number; pages: number; summary: { rating: number; reviewCount: number } }>(
        `/reviews${qs({ productId, page, limit: 10 })}`,
      ),
    enabled: Boolean(productId),
  });
}

export function useCreateReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { productId: string; rating: number; title?: string; body: string; photos?: string[] }) =>
      api<{ message: string }>('/reviews', { method: 'POST', body }),
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ['reviews', vars.productId] }),
  });
}

export function useWishlist(enabled: boolean) {
  return useQuery({
    queryKey: ['wishlist'],
    queryFn: async () => (await api<{ items: Product[] }>('/wishlist')).items,
    enabled,
  });
}

export function useWishlistMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ['wishlist'] });
  return {
    add: useMutation({
      mutationFn: (productId: string) => api('/wishlist', { method: 'POST', body: { productId } }),
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: (productId: string) => api(`/wishlist/${productId}`, { method: 'DELETE' }),
      onSuccess: invalidate,
    }),
    moveToCart: useMutation({
      mutationFn: (productId: string) => api<{ item: Product }>(`/wishlist/${productId}/move-to-cart`, { method: 'POST' }),
      onSuccess: invalidate,
    }),
  };
}

export function useValidateCoupon() {
  return useMutation({
    mutationFn: (body: { code: string; subtotal: number }) =>
      api<{ code: string; type: 'percentage' | 'fixed'; value: number; discount: number; description: string | null }>(
        '/coupons/validate',
        { method: 'POST', body },
      ),
  });
}

export function useMyOrders(page = 1) {
  return useQuery({
    queryKey: ['orders', 'mine', page],
    queryFn: () => api<Paginated<Order>>(`/orders${qs({ page, limit: 10 })}`),
    placeholderData: keepPreviousData,
  });
}

/** Order detail. With `poll`, refetches every 5s until the order is paid, cancelled or refunded. */
export function useOrder(id: string, poll = false) {
  return useQuery({
    queryKey: ['orders', 'detail', id],
    queryFn: async () => (await api<{ order: Order }>(`/orders/${id}`)).order,
    enabled: Boolean(id),
    refetchInterval: (query) => {
      if (!poll) return false;
      const o = query.state.data;
      if (!o) return 5000;
      const settled = o.paymentStatus === 'paid' || o.status === 'cancelled' || o.status === 'refunded';
      return settled ? false : 5000;
    },
  });
}

export function useCreateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api<{ order: Order; whatsappUrl: string | null }>('/orders', { method: 'POST', body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['orders'] }),
  });
}

export function useCancelOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api<{ order: Order }>(`/orders/${id}/cancel`, { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['orders'] }),
  });
}

export function useInitiatePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { orderId: string; provider: 'stripe' | 'airtel_money' | 'mpamba' | 'whatsapp' }) =>
      api<{ clientSecret?: string; instructions?: string; reference: string; amount: number }>('/payments/initiate', {
        method: 'POST',
        body,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['orders'] }),
  });
}

export function useCoupons(enabled: boolean) {
  return useQuery({
    queryKey: ['admin', 'coupons'],
    queryFn: async () => (await api<{ items: Coupon[] }>('/coupons')).items,
    enabled,
  });
}

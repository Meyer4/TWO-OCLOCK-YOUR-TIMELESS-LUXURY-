'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Address, User } from '@/lib/types';

export const authKeys = {
  me: ['auth', 'me'] as const,
  addresses: ['auth', 'addresses'] as const,
  referral: ['auth', 'referral'] as const,
};

export function useMe() {
  return useQuery({
    queryKey: authKeys.me,
    queryFn: async () => (await api<{ user: User }>('/auth/me')).user,
    retry: false,
    staleTime: 60_000,
  });
}

export function useLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { email: string; password: string }) =>
      api<{ user: User }>('/auth/login', { method: 'POST', body }),
    onSuccess: (data) => qc.setQueryData(authKeys.me, data.user),
  });
}

export function useRegister() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => api<{ user: User }>('/auth/register', { method: 'POST', body }),
    onSuccess: (data) => qc.setQueryData(authKeys.me, data.user),
  });
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api('/auth/logout', { method: 'POST' }),
    onSuccess: () => {
      qc.setQueryData(authKeys.me, null);
      qc.removeQueries({ queryKey: ['orders'] });
      qc.removeQueries({ queryKey: ['wishlist'] });
    },
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { name?: string; phone?: string }) =>
      api<{ user: User }>('/auth/me', { method: 'PATCH', body }),
    onSuccess: (data) => qc.setQueryData(authKeys.me, data.user),
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (body: { currentPassword: string; newPassword: string; confirmNewPassword: string }) =>
      api('/auth/change-password', { method: 'POST', body }),
  });
}

export function useAddresses(enabled = true) {
  return useQuery({
    queryKey: authKeys.addresses,
    queryFn: async () => (await api<{ items: Address[] }>('/auth/addresses')).items,
    enabled,
  });
}

export function useSaveAddress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id?: string; body: Record<string, unknown> }) =>
      input.id
        ? api(`/auth/addresses/${input.id}`, { method: 'PATCH', body: input.body })
        : api('/auth/addresses', { method: 'POST', body: input.body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: authKeys.addresses }),
  });
}

export function useDeleteAddress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api(`/auth/addresses/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: authKeys.addresses }),
  });
}

export function useReferral(enabled = true) {
  return useQuery({
    queryKey: authKeys.referral,
    queryFn: () => api<{ code: string; invited: number; rewarded: number; points: number }>('/auth/referral'),
    enabled,
  });
}

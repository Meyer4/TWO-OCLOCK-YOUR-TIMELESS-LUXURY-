'use client';

import { create } from 'zustand';

export interface Toast {
  id: number;
  message: string;
  tone: 'success' | 'error' | 'info';
}

interface ToastState {
  toasts: Toast[];
  show: (message: string, tone?: Toast['tone']) => void;
  dismiss: (id: number) => void;
}

let nextId = 1;

export const useToast = create<ToastState>((set, get) => ({
  toasts: [],
  show(message, tone = 'info') {
    const id = nextId++;
    set({ toasts: [...get().toasts, { id, message, tone }] });
    setTimeout(() => get().dismiss(id), 4000);
  },
  dismiss(id) {
    set({ toasts: get().toasts.filter((t) => t.id !== id) });
  },
}));

export const toast = {
  success: (message: string) => useToast.getState().show(message, 'success'),
  error: (message: string) => useToast.getState().show(message, 'error'),
  info: (message: string) => useToast.getState().show(message, 'info'),
};

'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface RecentState {
  ids: string[];
  push: (id: string) => void;
}

export const useRecentlyViewed = create<RecentState>()(
  persist(
    (set, get) => ({
      ids: [],
      push(id) {
        set({ ids: [id, ...get().ids.filter((x) => x !== id)].slice(0, 12) });
      },
    }),
    { name: 'tl-recent', version: 1 },
  ),
);

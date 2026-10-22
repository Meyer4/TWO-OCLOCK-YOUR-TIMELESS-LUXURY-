'use client';

import { useSyncExternalStore } from 'react';

const subscribe = () => () => undefined;

/** False during server render and the first client render, true afterwards. Avoids hydration mismatches for persisted client state. */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}

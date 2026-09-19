'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';

/**
 * Cloud-backed replacement for `useLocalStorageState`.
 * Value is stored per-restaurant in the `cloud_state` table keyed by `key`.
 *
 * API surface matches `useLocalStorageState`:
 *   const [value, setValue, reset] = useCloudState('seatsignals_foo', initial);
 */
export function useCloudState<T>(
  key: string,
  initial: T
): [T, React.Dispatch<React.SetStateAction<T>>, () => void] {
  const [value, setValue] = useState<T>(initial);
  const [hydrated, setHydrated] = useState(false);
  const writeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingWrite = useRef<T | null>(null);

  // Initial load
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/cloud-state?key=${encodeURIComponent(key)}`, { cache: 'no-store' });
        if (!res.ok) throw new Error(await res.text());
        const json = await res.json();
        if (cancelled) return;
        if (json.value !== null && json.value !== undefined) setValue(json.value as T);
      } catch {
        // fall back to initial
      } finally {
        if (!cancelled) setHydrated(true);
      }
    })();
    return () => { cancelled = true; };
  }, [key]);

  // Debounced write on change
  useEffect(() => {
    if (!hydrated) return;
    pendingWrite.current = value;
    if (writeTimer.current) clearTimeout(writeTimer.current);
    writeTimer.current = setTimeout(() => {
      const payload = pendingWrite.current;
      fetch(`/api/cloud-state?key=${encodeURIComponent(key)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: payload }),
      }).catch(() => {
        toast.error('Failed to save changes');
      });
    }, 400);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, hydrated, key]);

  const reset = useCallback(() => {
    fetch(`/api/cloud-state?key=${encodeURIComponent(key)}`, { method: 'DELETE' }).catch(() => {});
    setValue(initial);
  }, [key, initial]);

  return [value, setValue, reset];
}

/**
 * Cloud-backed replacement for `useCrudList`.
 * The entire array is stored as a JSON blob in cloud_state.
 * Good for small lists where per-row analytics isn't needed.
 *
 * For lists that DO need proper typed queries (customers, vendors, etc.),
 * use `useCrudApi` against a dedicated table/endpoint instead.
 */
export function useCloudCrudList<T extends { id: string | number }>(
  key: string,
  initial: T[]
) {
  const [items, setItems] = useCloudState<T[]>(key, initial);

  const add = useCallback((item: T) => {
    setItems((prev) => [item, ...prev]);
  }, [setItems]);

  const update = useCallback((id: T['id'], patch: Partial<T>) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  }, [setItems]);

  const remove = useCallback((id: T['id']) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, [setItems]);

  const reset = useCallback(() => {
    setItems(initial);
  }, [setItems, initial]);

  return { items, setItems, add, update, remove, reset };
}

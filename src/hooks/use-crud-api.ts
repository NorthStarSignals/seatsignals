'use client';

import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';

/**
 * Drop-in replacement for `useCrudList` that talks to a REST API instead of localStorage.
 *
 * Convention: the endpoint supports:
 *   GET    /api/<entity>          → list scoped to the caller's restaurant
 *   POST   /api/<entity>          → create { ...fields } (restaurant_id injected server-side)
 *   PATCH  /api/<entity>?id=X     → update  { ...fields }
 *   DELETE /api/<entity>?id=X     → delete
 *
 * Usage:
 *   const { items, add, update, remove, loading, error, refetch } =
 *     useCrudApi<Vendor>('/api/vendors');
 */
export function useCrudApi<T extends { id: string }>(endpoint: string) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(endpoint, { cache: 'no-store' });
      if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
      const data = await res.json();
      setItems(Array.isArray(data) ? data : (data.items || []));
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const add = useCallback(
    async (payload: Partial<Omit<T, 'id'>>): Promise<T | null> => {
      // Optimistic: give the row a temporary id, swap once server responds
      const tempId = `tmp_${Date.now()}`;
      const optimistic = { ...payload, id: tempId } as unknown as T;
      setItems((prev) => [optimistic, ...prev]);

      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
        const created = await res.json();
        setItems((prev) => prev.map((x) => (x.id === tempId ? (created as T) : x)));
        return created as T;
      } catch (e) {
        // Rollback optimistic insert
        setItems((prev) => prev.filter((x) => x.id !== tempId));
        const msg = e instanceof Error ? e.message : 'Failed to save';
        toast.error(msg);
        return null;
      }
    },
    [endpoint]
  );

  const update = useCallback(
    async (id: T['id'], patch: Partial<T>): Promise<T | null> => {
      // Optimistic update, rollback on failure
      const previous = items.find((x) => x.id === id);
      setItems((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x)));

      try {
        const res = await fetch(`${endpoint}?id=${encodeURIComponent(String(id))}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patch),
        });
        if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
        const updated = await res.json();
        setItems((prev) => prev.map((x) => (x.id === id ? (updated as T) : x)));
        return updated as T;
      } catch (e) {
        if (previous) setItems((prev) => prev.map((x) => (x.id === id ? previous : x)));
        const msg = e instanceof Error ? e.message : 'Failed to save';
        toast.error(msg);
        return null;
      }
    },
    [endpoint, items]
  );

  const remove = useCallback(
    async (id: T['id']): Promise<boolean> => {
      const previous = items;
      setItems((prev) => prev.filter((x) => x.id !== id));

      try {
        const res = await fetch(`${endpoint}?id=${encodeURIComponent(String(id))}`, {
          method: 'DELETE',
        });
        if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
        return true;
      } catch (e) {
        setItems(previous);
        const msg = e instanceof Error ? e.message : 'Failed to delete';
        toast.error(msg);
        return false;
      }
    },
    [endpoint, items]
  );

  return { items, setItems, add, update, remove, loading, error, refetch: fetchItems };
}

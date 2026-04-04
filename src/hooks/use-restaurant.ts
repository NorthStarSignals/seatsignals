'use client';

import { useState, useEffect, useCallback } from 'react';
import { Restaurant } from '@/lib/types';

export function useRestaurant() {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchRestaurant = useCallback(() => {
    fetch('/api/restaurant')
      .then((res) => {
        if (!res.ok) {
          console.error(`[useRestaurant] Failed to fetch restaurant: ${res.status} ${res.statusText}`);
          return null;
        }
        return res.json();
      })
      .then((data) => {
        setRestaurant(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('[useRestaurant] Error fetching restaurant:', err);
        setRestaurant(null);
        setLoading(false);
      });
  }, []);

  useEffect(() => { fetchRestaurant(); }, [fetchRestaurant]);

  return { restaurant, loading, mutate: fetchRestaurant };
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Restaurant } from '@/lib/types';

export function useRestaurant() {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchRestaurant = useCallback(() => {
    fetch('/api/restaurant')
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        setRestaurant(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => { fetchRestaurant(); }, [fetchRestaurant]);

  return { restaurant, loading, mutate: fetchRestaurant };
}

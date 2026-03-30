'use client';

import { useState, useEffect } from 'react';
import { Restaurant } from '@/lib/types';

export function useRestaurant() {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/restaurant')
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        setRestaurant(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return { restaurant, loading };
}

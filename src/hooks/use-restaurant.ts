'use client';

import { useState, useEffect, useCallback } from 'react';
import { Restaurant } from '@/lib/types';

const ACTIVE_RESTAURANT_KEY = 'seatsignals_active_restaurant_id';

export function useRestaurant() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchRestaurants = useCallback(async () => {
    try {
      const res = await fetch('/api/restaurants');
      if (!res.ok) {
        console.error(`[useRestaurant] Failed to fetch restaurants: ${res.status}`);
        setRestaurants([]);
        setLoading(false);
        return;
      }
      const data: Restaurant[] = await res.json();
      setRestaurants(data);

      // Restore saved active restaurant, validate it's still owned
      const savedId = localStorage.getItem(ACTIVE_RESTAURANT_KEY);
      const match = data.find((r) => r.restaurant_id === savedId);
      if (match) {
        setActiveId(match.restaurant_id);
      } else if (data.length > 0) {
        setActiveId(data[0].restaurant_id);
        localStorage.setItem(ACTIVE_RESTAURANT_KEY, data[0].restaurant_id);
      }
    } catch (err) {
      console.error('[useRestaurant] Error fetching restaurants:', err);
      setRestaurants([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRestaurants();
  }, [fetchRestaurants]);

  const setActiveRestaurant = useCallback(
    (id: string) => {
      const match = restaurants.find((r) => r.restaurant_id === id);
      if (match) {
        setActiveId(id);
        localStorage.setItem(ACTIVE_RESTAURANT_KEY, id);
      }
    },
    [restaurants]
  );

  const restaurant = restaurants.find((r) => r.restaurant_id === activeId) ?? null;

  return {
    restaurant,
    restaurants,
    setActiveRestaurant,
    loading,
    mutate: fetchRestaurants,
  };
}

'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Star } from 'lucide-react';

interface MenuItem {
  id: string;
  name: string;
  category: string;
  price: number;
  avg_rating: number | null;
}

interface Category {
  name: string;
  items: MenuItem[];
}

export default function PublicMenuPage() {
  const params = useParams();
  const restaurantId = params.restaurantId as string;
  const [categories, setCategories] = useState<Category[]>([]);
  const [restaurantName, setRestaurantName] = useState('');
  const [cuisineType, setCuisineType] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMenu() {
      try {
        const res = await fetch(`/api/public/menu/${restaurantId}`);
        if (res.ok) {
          const data = await res.json();
          setCategories(data.categories);
          setRestaurantName(data.restaurant_name);
          setCuisineType(data.cuisine_type || '');
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    fetchMenu();
  }, [restaurantId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-pulse text-gray-400">Loading menu...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Header */}
      <div className="text-center py-12 px-4 border-b border-gray-100">
        <h1 className="text-3xl font-bold text-gray-900">{restaurantName}</h1>
        {cuisineType && <p className="text-gray-500 mt-1">{cuisineType}</p>}
        <p className="text-sm text-gray-400 mt-2">Menu</p>
      </div>

      {/* Menu */}
      <div className="max-w-2xl mx-auto px-4 py-8">
        {categories.length === 0 ? (
          <p className="text-center text-gray-400 py-12">No menu items available</p>
        ) : (
          categories.map(cat => (
            <div key={cat.name} className="mb-10">
              <h2 className="text-lg font-bold text-gray-900 border-b-2 border-rose-500 pb-2 mb-4">
                {cat.name}
              </h2>
              <div className="space-y-4">
                {cat.items.map(item => (
                  <div key={item.id} className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-gray-900">{item.name}</h3>
                        {item.avg_rating && item.avg_rating >= 4 && (
                          <div className="flex items-center gap-0.5 text-amber-400">
                            <Star size={10} className="fill-amber-400" />
                            <span className="text-[10px]">{item.avg_rating.toFixed(1)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-gray-900 ml-4">
                      ${item.price.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="text-center py-8 border-t border-gray-100">
        <p className="text-xs text-gray-400">
          Powered by <span className="font-semibold text-gray-500">SeatSignals</span>
        </p>
      </div>
    </div>
  );
}

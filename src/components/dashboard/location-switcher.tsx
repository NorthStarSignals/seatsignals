'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, Plus, Check, Building2 } from 'lucide-react';
import { useRestaurant } from '@/hooks/use-restaurant';
import { cn } from '@/lib/utils';

export function LocationSwitcher() {
  const { restaurant, restaurants, setActiveRestaurant, loading } = useRestaurant();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  if (loading || !restaurant) return null;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-seat-card border border-seat-border hover:bg-zinc-800 transition-colors text-sm"
      >
        <Building2 size={14} className="text-zinc-400" />
        <span className="text-white font-medium max-w-[180px] truncate">
          {restaurant.name}
        </span>
        <ChevronDown
          size={14}
          className={cn(
            'text-zinc-400 transition-transform',
            open && 'rotate-180'
          )}
        />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1.5 w-[300px] bg-seat-card border border-seat-border rounded-lg shadow-xl z-50 overflow-hidden">
          <div className="px-3 py-2 border-b border-seat-border">
            <p className="text-[11px] text-zinc-500 font-medium uppercase tracking-wider">
              Your Locations
            </p>
          </div>

          <div className="max-h-[280px] overflow-y-auto">
            {restaurants.map((r) => {
              const isActive = r.restaurant_id === restaurant.restaurant_id;
              return (
                <button
                  key={r.restaurant_id}
                  onClick={() => {
                    setActiveRestaurant(r.restaurant_id);
                    setOpen(false);
                  }}
                  className={cn(
                    'w-full flex items-start gap-3 px-3 py-2.5 text-left hover:bg-zinc-800 transition-colors',
                    isActive && 'bg-zinc-800/50'
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-white font-medium truncate">
                        {r.name}
                      </span>
                      {isActive && (
                        <Check size={14} className="text-seat-red shrink-0" />
                      )}
                    </div>
                    <p className="text-[12px] text-zinc-500 truncate mt-0.5">
                      {r.address}
                    </p>
                  </div>
                  <span className="text-[10px] font-medium text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded shrink-0 mt-0.5">
                    {r.cuisine_type}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="border-t border-seat-border">
            <button
              onClick={() => {
                setOpen(false);
                router.push('/dashboard/locations');
              }}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <Plus size={14} />
              <span>Add Location</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

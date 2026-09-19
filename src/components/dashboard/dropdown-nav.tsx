'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

type DropdownItem = { label: string; href: string };
type DropdownGroup = { label: string; items: DropdownItem[] };

export function DropdownNav({
  title,
  groups,
}: {
  title: string;
  groups: DropdownGroup[];
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Find the currently active item to show its label on the trigger
  const allItems = groups.flatMap(g => g.items.map(i => ({ ...i, group: g.label })));
  const active = allItems.find(
    i => pathname === i.href || pathname.startsWith(i.href + '/')
  );
  const currentLabel = active?.label || 'Overview';
  const currentGroup = active?.group;

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Close on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div className="relative mb-6 -mt-1" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-3 px-4 py-2.5 bg-seat-card border border-seat-border rounded-lg text-sm font-medium text-white hover:border-zinc-600 transition-colors"
      >
        <span className="text-zinc-500 text-xs uppercase tracking-wider">{title}</span>
        <span className="text-zinc-700">/</span>
        {currentGroup && <span className="text-zinc-500 text-xs">{currentGroup} /</span>}
        <span>{currentLabel}</span>
        <ChevronDown
          size={14}
          className={cn('text-zinc-500 transition-transform', open && 'rotate-180')}
        />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-2 z-50 w-[640px] max-w-[95vw] bg-seat-card border border-seat-border rounded-xl shadow-2xl overflow-hidden">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-0 p-2 max-h-[70vh] overflow-y-auto">
            {groups.map(group => (
              <div key={group.label} className="p-2">
                <div className="px-2 pb-1.5 text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">
                  {group.label}
                </div>
                <div className="space-y-0.5">
                  {group.items.map(item => {
                    const isActive =
                      pathname === item.href || pathname.startsWith(item.href + '/');
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          'flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-colors',
                          isActive
                            ? 'bg-seat-red/15 text-white'
                            : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                        )}
                      >
                        <span>{item.label}</span>
                        {isActive && <Check size={12} className="text-seat-red" />}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Simple flat dropdown (non-grouped) for pages with ≤10 tabs
export function SimpleDropdownNav({
  title,
  items,
}: {
  title: string;
  items: DropdownItem[];
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const active = items.find(
    i => pathname === i.href || pathname.startsWith(i.href + '/')
  );
  const currentLabel = active?.label || items[0]?.label || 'Overview';

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  useEffect(() => setOpen(false), [pathname]);

  return (
    <div className="relative mb-6 -mt-1" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-3 px-4 py-2.5 bg-seat-card border border-seat-border rounded-lg text-sm font-medium text-white hover:border-zinc-600 transition-colors"
      >
        <span className="text-zinc-500 text-xs uppercase tracking-wider">{title}</span>
        <span className="text-zinc-700">/</span>
        <span>{currentLabel}</span>
        <ChevronDown
          size={14}
          className={cn('text-zinc-500 transition-transform', open && 'rotate-180')}
        />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-2 z-50 w-64 bg-seat-card border border-seat-border rounded-xl shadow-2xl overflow-hidden p-1.5">
          {items.map(item => {
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors',
                  isActive
                    ? 'bg-seat-red/15 text-white'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                )}
              >
                <span>{item.label}</span>
                {isActive && <Check size={14} className="text-seat-red" />}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

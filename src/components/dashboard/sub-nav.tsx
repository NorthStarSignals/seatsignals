'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

type SubNavItem = { label: string; href: string };
type SubNavGroup = { label: string; items: SubNavItem[] };

export function SubNav({ items }: { items: SubNavItem[] }) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + '/');

  return (
    <div className="border-b border-seat-border mb-6 -mt-2 overflow-x-auto">
      <div className="flex gap-1 min-w-max">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'px-3 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
              isActive(item.href)
                ? 'border-seat-red text-white'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            )}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

export function GroupedSubNav({ groups }: { groups: SubNavGroup[] }) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + '/');

  return (
    <div className="border-b border-seat-border mb-6 -mt-2 overflow-x-auto">
      <div className="flex gap-6 min-w-max">
        {groups.map((group) => (
          <div key={group.label} className="flex items-center gap-1">
            <span className="text-[10px] uppercase tracking-wider text-zinc-600 font-semibold mr-1">
              {group.label}
            </span>
            {group.items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'px-2.5 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap',
                  isActive(item.href)
                    ? 'border-seat-red text-white'
                    : 'border-transparent text-zinc-500 hover:text-zinc-300'
                )}
              >
                {item.label}
              </Link>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

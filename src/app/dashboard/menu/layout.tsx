'use client';

import { SimpleDropdownNav } from '@/components/dashboard/dropdown-nav';

const items = [
  { label: 'Menu', href: '/dashboard/menu' },
  { label: 'Performance', href: '/dashboard/menu/performance' },
  { label: 'Photos', href: '/dashboard/menu/photos' },
  { label: 'Allergens', href: '/dashboard/menu/allergens' },
  { label: 'Specials', href: '/dashboard/menu/specials' },
  { label: 'Costing', href: '/dashboard/menu/costing' },
];

export default function MenuLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <SimpleDropdownNav title="Menu" items={items} />
      {children}
    </div>
  );
}

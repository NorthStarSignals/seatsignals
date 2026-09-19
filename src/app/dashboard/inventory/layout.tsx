'use client';

import { SimpleDropdownNav } from '@/components/dashboard/dropdown-nav';

const items = [
  { label: 'Overview', href: '/dashboard/inventory' },
  { label: 'Par Levels', href: '/dashboard/inventory/par-levels' },
  { label: 'Waste Log', href: '/dashboard/inventory/waste-log' },
  { label: 'Price Tracker', href: '/dashboard/inventory/price-tracker' },
];

export default function InventoryLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <SimpleDropdownNav title="Inventory" items={items} />
      {children}
    </div>
  );
}

'use client';

import { SimpleDropdownNav } from '@/components/dashboard/dropdown-nav';

const items = [
  { label: 'Reservations', href: '/dashboard/reservations' },
  { label: 'No-Shows', href: '/dashboard/reservations/no-shows' },
  { label: 'Capacity', href: '/dashboard/reservations/capacity' },
  { label: 'Deposits', href: '/dashboard/reservations/deposits' },
  { label: 'Analytics', href: '/dashboard/reservations/analytics' },
];

export default function ReservationsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <SimpleDropdownNav title="Reservations" items={items} />
      {children}
    </div>
  );
}

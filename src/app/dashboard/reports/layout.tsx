'use client';

import { SimpleDropdownNav } from '@/components/dashboard/dropdown-nav';

const items = [
  { label: 'Overview', href: '/dashboard/reports' },
  { label: 'Automated', href: '/dashboard/reports/automated' },
  { label: 'Custom', href: '/dashboard/reports/custom' },
  { label: 'Daily Closing', href: '/dashboard/reports/daily-closing' },
  { label: 'Tax', href: '/dashboard/reports/tax' },
  { label: 'Investor', href: '/dashboard/reports/investor' },
];

export default function ReportsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <SimpleDropdownNav title="Reports" items={items} />
      {children}
    </div>
  );
}

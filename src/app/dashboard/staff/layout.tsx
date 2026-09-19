'use client';

import { SimpleDropdownNav } from '@/components/dashboard/dropdown-nav';

const items = [
  { label: 'Schedule', href: '/dashboard/staff/schedule' },
  { label: 'Directory', href: '/dashboard/staff/directory' },
  { label: 'Time Clock', href: '/dashboard/staff/timeclock' },
  { label: 'Payroll', href: '/dashboard/staff/payroll' },
  { label: 'Shift Swaps', href: '/dashboard/staff/swaps' },
  { label: 'Onboarding', href: '/dashboard/staff/onboarding' },
  { label: 'Training', href: '/dashboard/staff/training' },
  { label: 'Certifications', href: '/dashboard/staff/certifications' },
  { label: 'Reviews', href: '/dashboard/staff/performance-reviews' },
  { label: 'Messaging', href: '/dashboard/staff/messaging' },
];

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <SimpleDropdownNav title="Staff" items={items} />
      {children}
    </div>
  );
}

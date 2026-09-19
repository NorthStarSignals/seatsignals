'use client';

import { DropdownNav } from '@/components/dashboard/dropdown-nav';

const analyticsGroups = [
  {
    label: 'Overview',
    items: [
      { label: 'Dashboard', href: '/dashboard/analytics' },
      { label: 'Health', href: '/dashboard/analytics/health' },
    ],
  },
  {
    label: 'Financial',
    items: [
      { label: 'Food Cost', href: '/dashboard/analytics/food-cost' },
      { label: 'Labor Cost', href: '/dashboard/analytics/labor-cost' },
      { label: 'Profit & Loss', href: '/dashboard/analytics/profit-loss' },
      { label: 'Revenue Forecast', href: '/dashboard/analytics/revenue-forecast' },
    ],
  },
  {
    label: 'Guest',
    items: [
      { label: 'Sentiment', href: '/dashboard/analytics/sentiment' },
      { label: 'NPS / CSAT', href: '/dashboard/analytics/nps' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { label: 'Peak Hours', href: '/dashboard/analytics/peak-hours' },
      { label: 'Table Turnover', href: '/dashboard/analytics/table-turnover' },
    ],
  },
];

export default function AnalyticsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <DropdownNav title="Analytics" groups={analyticsGroups} />
      {children}
    </div>
  );
}

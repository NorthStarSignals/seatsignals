'use client';

import { DropdownNav } from '@/components/dashboard/dropdown-nav';

const groups = [
  {
    label: 'General',
    items: [
      { label: 'Overview', href: '/dashboard/settings' },
      { label: 'Hours', href: '/dashboard/settings/hours' },
      { label: 'Roles', href: '/dashboard/settings/roles' },
      { label: 'Branding', href: '/dashboard/settings/branding' },
      { label: 'Appearance', href: '/dashboard/settings/appearance' },
    ],
  },
  {
    label: 'Channels',
    items: [
      { label: 'Email', href: '/dashboard/settings/email-config' },
      { label: 'SMS', href: '/dashboard/settings/sms-config' },
      { label: 'Integrations', href: '/dashboard/settings/integrations' },
      { label: 'Webhooks', href: '/dashboard/settings/webhooks' },
    ],
  },
  {
    label: 'Data',
    items: [
      { label: 'POS Import', href: '/dashboard/settings/import' },
      { label: 'Tax Config', href: '/dashboard/settings/tax-config' },
    ],
  },
  {
    label: 'Compliance',
    items: [
      { label: 'Privacy / GDPR', href: '/dashboard/settings/privacy' },
      { label: 'Notifications', href: '/dashboard/settings/notifications' },
    ],
  },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <DropdownNav title="Settings" groups={groups} />
      {children}
    </div>
  );
}

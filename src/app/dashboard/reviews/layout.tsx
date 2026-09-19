'use client';

import { SimpleDropdownNav } from '@/components/dashboard/dropdown-nav';

const items = [
  { label: 'Inbox', href: '/dashboard/reviews' },
  { label: 'AI Responder', href: '/dashboard/ai/sentiment-responder' },
];

export default function ReviewsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <SimpleDropdownNav title="Reviews" items={items} />
      {children}
    </div>
  );
}

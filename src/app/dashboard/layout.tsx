'use client';

import { Sidebar } from '@/components/dashboard/sidebar';
import { Toaster } from 'react-hot-toast';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-seat-black">
      <Sidebar />
      <main className="lg:ml-[240px] p-6 lg:p-8 pt-16 lg:pt-8">
        {children}
      </main>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#18181B',
            color: '#FAFAFA',
            border: '1px solid #27272A',
            borderRadius: '8px',
            fontSize: '13px',
          },
        }}
      />
    </div>
  );
}

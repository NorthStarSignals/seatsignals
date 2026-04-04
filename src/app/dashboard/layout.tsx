'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Toaster } from 'react-hot-toast';
import { useRestaurant } from '@/hooks/use-restaurant';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { restaurant, loading } = useRestaurant();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !restaurant) {
      router.replace('/onboarding');
    }
  }, [loading, restaurant, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-seat-black flex items-center justify-center">
        <div className="text-zinc-400 text-sm">Loading...</div>
      </div>
    );
  }

  if (!restaurant) {
    return null;
  }

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

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { UserButton } from '@clerk/nextjs';
import { Sidebar } from '@/components/dashboard/sidebar';
import { NotificationBell } from '@/components/dashboard/notification-bell';
import { CommandPalette } from '@/components/dashboard/command-palette';
import toast, { Toaster } from 'react-hot-toast';
import { useRestaurant } from '@/hooks/use-restaurant';
import { LocationSwitcher } from '@/components/dashboard/location-switcher';
import { ChangelogModal } from '@/components/dashboard/changelog-modal';
import { DemoTour } from '@/components/demo-tour';
import { PlanSwitcher } from '@/components/dashboard/plan-switcher';

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
      <header className="lg:ml-[220px] sticky top-0 z-20 bg-seat-black/80 backdrop-blur border-b border-seat-border px-6 lg:px-8 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <LocationSwitcher />
          <p className="text-sm text-zinc-400">
            Welcome back, <span className="text-white font-medium">{restaurant.name}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={async () => {
              const t = toast.loading('Loading demo data...');
              try {
                const r = await fetch('/api/demo/seed-full', { method: 'POST' });
                if (r.ok) {
                  const d = await r.json();
                  const s = d.seeded || {};
                  toast.success(
                    `Seeded ${s.customers || 0} customers · ${s.reviews || 0} reviews · ${s.pos_orders || 0} POS orders`,
                    { id: t }
                  );
                  setTimeout(() => window.location.reload(), 1200);
                } else {
                  toast.error('Seed failed: ' + (await r.text()), { id: t });
                }
              } catch {
                toast.error('Network error', { id: t });
              }
            }}
            className="text-xs text-zinc-500 hover:text-seat-red px-2 py-1 border border-seat-border rounded"
            title="Populate this workspace with realistic demo data"
          >
            Load Demo Data
          </button>
          <PlanSwitcher />
          <ChangelogModal />
          <NotificationBell />
          <div className="pl-2 ml-1 border-l border-seat-border">
            <UserButton
              afterSignOutUrl="/"
              appearance={{
                elements: {
                  userButtonAvatarBox: 'w-8 h-8',
                  userButtonPopoverCard: 'bg-seat-card border border-seat-border',
                  userButtonPopoverActionButton: 'text-zinc-300 hover:bg-zinc-800',
                  userButtonPopoverFooter: 'hidden',
                },
              }}
            />
          </div>
        </div>
      </header>
      <main className="lg:ml-[220px] p-6 lg:p-8">
        {children}
      </main>
      <CommandPalette />
      <DemoTour />
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

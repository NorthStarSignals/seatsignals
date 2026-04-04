'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  Star,
  Utensils,
  Building2,
  Clock,
  Cake,
  Truck,
  Settings,
  Menu,
  X,
  Brain,
} from 'lucide-react';
import { useState } from 'react';

const mainNav = [
  { label: 'Overview', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Customers', href: '/dashboard/customers', icon: Users },
  { label: 'Reviews', href: '/dashboard/reviews', icon: Star },
];

const revenueNav = [
  { label: 'Catering', href: '/dashboard/catering', icon: Utensils },
  { label: 'Corporate', href: '/dashboard/corporate', icon: Building2 },
  { label: 'Dead Hours', href: '/dashboard/dead-hours', icon: Clock },
  { label: 'Birthdays', href: '/dashboard/birthdays', icon: Cake },
  { label: 'Delivery', href: '/dashboard/delivery', icon: Truck },
];

const aiNav = [
  { label: 'Cortex', href: '/dashboard/intelligence', icon: Brain },
];

const bottomNav = [
  { label: 'Settings', href: '/dashboard/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) =>
    pathname === href || (href !== '/dashboard' && pathname.startsWith(href));

  const NavLink = ({ item }: { item: typeof mainNav[0] }) => {
    const active = isActive(item.href);
    return (
      <Link
        href={item.href}
        onClick={() => setMobileOpen(false)}
        className={cn(
          'flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors relative',
          active
            ? 'text-white bg-zinc-800'
            : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
        )}
      >
        {active && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-4 bg-seat-red rounded-r" />
        )}
        <item.icon size={16} strokeWidth={active ? 2 : 1.5} />
        {item.label}
      </Link>
    );
  };

  return (
    <>
      {/* Mobile hamburger */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-zinc-900 rounded-lg border border-zinc-800"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X size={18} className="text-white" /> : <Menu size={18} className="text-white" />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 z-30 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 h-full w-[240px] bg-seat-black border-r border-zinc-800 z-40 transition-transform lg:translate-x-0 flex flex-col',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="px-5 py-6">
          <h1 className="text-lg font-bold text-white tracking-tight">
            Seat<span className="text-seat-red">Signals</span>
          </h1>
          <p className="text-[11px] text-zinc-500 font-medium tracking-wide mt-0.5">
            Restaurant Revenue OS
          </p>
        </div>

        {/* Main nav */}
        <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
          {mainNav.map((item) => (
            <NavLink key={item.href} item={item} />
          ))}

          {/* Section divider */}
          <div className="pt-4 pb-2">
            <p className="px-3 text-[10px] font-semibold text-zinc-600 uppercase tracking-widest">
              Revenue Pillars
            </p>
          </div>

          {revenueNav.map((item) => (
            <NavLink key={item.href} item={item} />
          ))}

          {/* AI section */}
          <div className="pt-4 pb-2">
            <p className="px-3 text-[10px] font-semibold text-zinc-600 uppercase tracking-widest">
              AI Engine
            </p>
          </div>

          {aiNav.map((item) => (
            <NavLink key={item.href} item={item} />
          ))}
        </nav>

        {/* Bottom section */}
        <div className="px-3 py-4 border-t border-zinc-800/50">
          {bottomNav.map((item) => (
            <NavLink key={item.href} item={item} />
          ))}
        </div>
      </aside>
    </>
  );
}

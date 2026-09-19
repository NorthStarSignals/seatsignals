'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  Star,
  Utensils,
  Clock,
  Settings,
  Menu,
  X,
  Brain,
  Zap,
  ClipboardList,
  Sparkles,
  MessageCircle,
  Target,
  CalendarCheck,
  Package,
  Trophy,
  Send,
  CalendarDays,
  PartyPopper,
  LayoutGrid,
  ListOrdered,
  ChefHat,
  DollarSign,
  ShoppingBag,
  BookOpen,
  Wrench,
  Filter,
  Gift,
  Crown,
  Award,
  BarChart3,
  FileText,
  Percent,
  ChevronDown,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { usePlan, Plan, planAtLeast } from '@/hooks/use-plan';

type NavItem = {
  label: string;
  href: string;
  icon: React.ElementType;
  /** Plans that can SEE this item in the sidebar. Default = all paid plans. */
  minPlan?: Plan;
};
type NavSection = {
  id: string;
  label: string;
  items: NavItem[];
  /** If set, the entire section is hidden for plans below this. */
  minPlan?: Plan;
};

// Always-visible top items — everything a Growth+ user lands on daily
const pinnedNav: NavItem[] = [
  { label: 'Overview', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Signal IQ', href: '/dashboard/intelligence', icon: Brain },
  { label: 'Ask AI', href: '/dashboard/ask', icon: MessageCircle },
  { label: 'Reservations', href: '/dashboard/reservations', icon: CalendarCheck },
  { label: 'Customers', href: '/dashboard/customers', icon: Users },
];

const sections: NavSection[] = [
  {
    id: 'guests',
    label: 'Guests',
    items: [
      { label: 'Segments', href: '/dashboard/segments', icon: Filter },
      { label: 'Loyalty', href: '/dashboard/loyalty', icon: Award },
      { label: 'VIP', href: '/dashboard/vip', icon: Crown },
      { label: 'Gift Cards', href: '/dashboard/gift-cards', icon: Gift },
    ],
  },
  {
    id: 'marketing',
    label: 'Marketing',
    items: [
      { label: 'Reviews', href: '/dashboard/reviews', icon: Star },
      { label: 'Campaigns', href: '/dashboard/email-campaigns', icon: Sparkles },
      { label: 'Surveys', href: '/dashboard/surveys', icon: ClipboardList },
      { label: 'Promos', href: '/dashboard/promos', icon: Percent },
      { label: 'Outreach', href: '/dashboard/outreach', icon: Send, minPlan: 'pro' },
    ],
  },
  {
    id: 'floor',
    label: 'Floor & Orders',
    items: [
      { label: 'Tables', href: '/dashboard/tables', icon: LayoutGrid },
      { label: 'Waitlist', href: '/dashboard/waitlist', icon: ListOrdered },
      { label: 'Kitchen', href: '/dashboard/kitchen', icon: ChefHat },
      { label: 'Online Orders', href: '/dashboard/online-ordering', icon: ShoppingBag },
    ],
  },
  {
    id: 'menu',
    label: 'Menu',
    items: [
      { label: 'Menu', href: '/dashboard/menu', icon: Zap },
      { label: 'Recipes', href: '/dashboard/recipes', icon: BookOpen, minPlan: 'pro' },
    ],
  },
  {
    id: 'inventory',
    label: 'Inventory',
    items: [
      { label: 'Inventory', href: '/dashboard/inventory', icon: Package },
      { label: 'Vendors', href: '/dashboard/vendors', icon: Package, minPlan: 'pro' },
      { label: 'Purchase Orders', href: '/dashboard/purchase-orders', icon: ClipboardList, minPlan: 'pro' },
      { label: 'Maintenance', href: '/dashboard/maintenance', icon: Wrench, minPlan: 'pro' },
    ],
  },
  {
    id: 'staff',
    label: 'Staff',
    items: [
      { label: 'Schedule', href: '/dashboard/staff/schedule', icon: CalendarDays },
      { label: 'Team', href: '/dashboard/team', icon: Users },
      { label: 'Payroll', href: '/dashboard/staff/payroll', icon: DollarSign, minPlan: 'pro' },
      { label: 'Tips', href: '/dashboard/tips', icon: DollarSign },
    ],
  },
  {
    id: 'revenue',
    label: 'Revenue',
    items: [
      { label: 'Catering', href: '/dashboard/catering', icon: Utensils },
      { label: 'Corporate', href: '/dashboard/corporate', icon: Users, minPlan: 'pro' },
      { label: 'Events', href: '/dashboard/events', icon: PartyPopper },
      { label: 'Dead Hours', href: '/dashboard/dead-hours', icon: Clock },
      { label: 'Goals', href: '/dashboard/goals', icon: Target },
      { label: 'Leaderboard', href: '/dashboard/leaderboard', icon: Trophy },
      { label: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
      { label: 'Reports', href: '/dashboard/reports', icon: FileText },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const plan = usePlan();
  const { user } = useUser();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());

  // Show admin links to internal North Star emails only
  const email = user?.primaryEmailAddress?.emailAddress || '';
  const isInternal = /@(seatsignals\.app|northstarsignals\.io|northstarholdings\.co)$/i.test(email);

  const isActive = (href: string) =>
    pathname === href || (href !== '/dashboard' && pathname.startsWith(href));

  // Filter items/sections by plan
  const visibleSections = sections
    .filter((s) => !s.minPlan || planAtLeast(plan, s.minPlan))
    .map((s) => ({
      ...s,
      items: s.items.filter((i) => !i.minPlan || planAtLeast(plan, i.minPlan)),
    }))
    .filter((s) => s.items.length > 0);

  // Auto-open the section containing the current page
  useEffect(() => {
    const match = visibleSections.find((s) => s.items.some((i) => isActive(i.href)));
    if (match) {
      setOpenSections((prev) => {
        if (prev.has(match.id)) return prev;
        const next = new Set(prev);
        next.add(match.id);
        return next;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const toggleSection = (id: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const NavLink = ({ item, indent = false }: { item: NavItem; indent?: boolean }) => {
    const active = isActive(item.href);
    return (
      <Link
        href={item.href}
        onClick={() => setMobileOpen(false)}
        className={cn(
          'flex items-center gap-3 py-2 rounded-lg text-[13px] font-medium transition-colors relative',
          indent ? 'pl-8 pr-3' : 'px-3',
          active
            ? 'text-white bg-zinc-800'
            : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
        )}
      >
        {active && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-4 bg-seat-red rounded-r" />
        )}
        <item.icon size={14} strokeWidth={active ? 2 : 1.5} />
        {item.label}
      </Link>
    );
  };

  return (
    <>
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-zinc-900 rounded-lg border border-zinc-800"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X size={18} className="text-white" /> : <Menu size={18} className="text-white" />}
      </button>

      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 z-30 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed top-0 left-0 h-full w-[220px] bg-seat-black border-r border-zinc-800 z-40 transition-transform lg:translate-x-0 flex flex-col',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="px-5 py-5 border-b border-zinc-800/50">
          <h1 className="text-lg font-bold text-white tracking-tight">
            Seat<span className="text-seat-red">Signals</span>
          </h1>
          <p className="text-[10px] text-zinc-500 font-medium tracking-wide mt-0.5">
            Restaurant Revenue OS
          </p>
        </div>

        <nav className="flex-1 px-3 py-3 overflow-y-auto">
          <div className="space-y-0.5">
            {pinnedNav.map((item) => (
              <NavLink key={item.href} item={item} />
            ))}
          </div>

          <div className="mt-3 pt-3 border-t border-zinc-800/50 space-y-0.5">
            {visibleSections.map((section) => {
              const isOpen = openSections.has(section.id);
              const hasActive = section.items.some((i) => isActive(i.href));
              return (
                <div key={section.id}>
                  <button
                    onClick={() => toggleSection(section.id)}
                    className={cn(
                      'w-full flex items-center justify-between px-3 py-2 rounded-lg text-[13px] font-medium transition-colors',
                      hasActive
                        ? 'text-white'
                        : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                    )}
                  >
                    <span>{section.label}</span>
                    <ChevronDown
                      size={14}
                      className={cn(
                        'text-zinc-600 transition-transform duration-150',
                        isOpen ? 'rotate-0' : '-rotate-90'
                      )}
                    />
                  </button>
                  {isOpen && (
                    <div className="mt-0.5 space-y-0.5 animate-in fade-in slide-in-from-top-1 duration-150">
                      {section.items.map((item) => (
                        <NavLink key={item.href} item={item} indent />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </nav>

        <div className="px-3 py-3 border-t border-zinc-800/50">
          <Link
            href="/dashboard/settings"
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors',
              isActive('/dashboard/settings')
                ? 'text-white bg-zinc-800'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
            )}
          >
            <Settings size={14} />
            Settings
          </Link>
          {isInternal && (
            <Link
              href="/dashboard/admin/demo"
              className={cn(
                'mt-1 flex items-center gap-3 px-3 py-2 rounded-lg text-[12px] font-medium transition-colors',
                isActive('/dashboard/admin/demo')
                  ? 'text-amber-300 bg-amber-500/10'
                  : 'text-zinc-500 hover:text-amber-300 hover:bg-amber-500/5'
              )}
            >
              <Sparkles size={12} />
              Admin · Demo
            </Link>
          )}
        </div>
      </aside>
    </>
  );
}

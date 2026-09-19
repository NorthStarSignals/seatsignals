'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  ArrowRight,
  Users,
  Star,
  Building2,
  Command,
  LayoutDashboard,
  Utensils,
  Clock,
  Cake,
  Truck,
  Settings,
  Zap,
  Brain,
  Snowflake,
} from 'lucide-react';

interface CustomerResult {
  customer_id: string;
  first_name: string;
  email: string;
  phone: string;
  visit_count: number;
}

interface ReviewResult {
  review_id: string;
  author: string;
  rating: number;
  platform: string;
  text: string;
}

interface LeadResult {
  lead_id: string;
  company_name: string;
  contact_name: string;
  sequence_status: string;
}

interface SearchResults {
  customers: CustomerResult[];
  reviews: ReviewResult[];
  leads: LeadResult[];
}

const navigationItems = [
  { label: 'Overview', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Customers', href: '/dashboard/customers', icon: Users },
  { label: 'Reviews', href: '/dashboard/reviews', icon: Star },
  { label: 'Sequences', href: '/dashboard/sequences', icon: Zap },
  { label: 'Catering', href: '/dashboard/catering', icon: Utensils },
  { label: 'Corporate', href: '/dashboard/corporate', icon: Building2 },
  { label: 'Dead Hours', href: '/dashboard/dead-hours', icon: Clock },
  { label: 'Birthdays', href: '/dashboard/birthdays', icon: Cake },
  { label: 'Delivery', href: '/dashboard/delivery', icon: Truck },
  { label: 'Signal IQ', href: '/dashboard/intelligence', icon: Brain },
  { label: 'AI Analytics', href: '/dashboard/analytics', icon: Snowflake },
  { label: 'Settings', href: '/dashboard/settings', icon: Settings },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults>({ customers: [], reviews: [], leads: [] });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();

  // Keyboard shortcut to open
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setResults({ customers: [], reviews: [], leads: [] });
      setSelectedIndex(0);
    }
  }, [open]);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.length < 2) {
      setResults({ customers: [], reviews: [], leads: [] });
      setLoading(false);
      return;
    }

    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data);
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  // Build flat list of all selectable items
  const buildItems = useCallback(() => {
    const items: { type: string; label: string; sublabel?: string; href: string }[] = [];

    // Filtered navigation
    const filteredNav = query
      ? navigationItems.filter((item) => item.label.toLowerCase().includes(query.toLowerCase()))
      : navigationItems;

    filteredNav.forEach((item) => {
      items.push({ type: 'navigation', label: item.label, href: item.href });
    });

    results.customers.forEach((c) => {
      items.push({
        type: 'customer',
        label: c.first_name || 'Unknown',
        sublabel: c.email || c.phone || '',
        href: `/dashboard/customers/${c.customer_id}`,
      });
    });

    results.reviews.forEach((r) => {
      items.push({
        type: 'review',
        label: r.author || 'Anonymous',
        sublabel: `${'★'.repeat(r.rating || 0)} ${r.platform || ''}`,
        href: '/dashboard/reviews',
      });
    });

    results.leads.forEach((l) => {
      items.push({
        type: 'lead',
        label: l.company_name || 'Unknown',
        sublabel: l.sequence_status || '',
        href: '/dashboard/catering',
      });
    });

    return items;
  }, [query, results]);

  const items = buildItems();

  // Reset selection when items change
  useEffect(() => {
    setSelectedIndex(0);
  }, [query, results]);

  const navigate = useCallback(
    (href: string) => {
      setOpen(false);
      router.push(href);
    },
    [router]
  );

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(items.length, 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + items.length) % Math.max(items.length, 1));
    } else if (e.key === 'Enter' && items[selectedIndex]) {
      e.preventDefault();
      navigate(items[selectedIndex].href);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
    }
  };

  // Group items by type for rendering
  const navItems = items.filter((i) => i.type === 'navigation');
  const customerItems = items.filter((i) => i.type === 'customer');
  const reviewItems = items.filter((i) => i.type === 'review');
  const leadItems = items.filter((i) => i.type === 'lead');

  const getGlobalIndex = (type: string, localIndex: number) => {
    let offset = 0;
    if (type === 'customer') offset = navItems.length;
    else if (type === 'review') offset = navItems.length + customerItems.length;
    else if (type === 'lead') offset = navItems.length + customerItems.length + reviewItems.length;
    return offset + localIndex;
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />

      {/* Palette */}
      <div className="relative w-full max-w-lg mx-4 bg-seat-card border border-seat-border rounded-xl shadow-2xl overflow-hidden">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-seat-border">
          <Search size={18} className="text-zinc-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search pages, customers, reviews..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent text-white text-sm placeholder:text-zinc-500 outline-none"
          />
          <kbd className="hidden sm:flex items-center gap-1 px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-[10px] text-zinc-400 font-medium">
            <Command size={10} />K
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[50vh] overflow-y-auto py-2">
          {items.length === 0 && query.length >= 2 && !loading && (
            <p className="px-4 py-6 text-center text-sm text-zinc-500">No results found.</p>
          )}

          {loading && query.length >= 2 && (
            <p className="px-4 py-6 text-center text-sm text-zinc-500">Searching...</p>
          )}

          {/* Navigation */}
          {navItems.length > 0 && (
            <div>
              <p className="px-4 py-1.5 text-[10px] font-semibold text-zinc-600 uppercase tracking-widest">
                Navigation
              </p>
              {navItems.map((item, i) => {
                const globalIdx = getGlobalIndex('navigation', i);
                const navDef = navigationItems.find((n) => n.href === item.href);
                const Icon = navDef?.icon || ArrowRight;
                return (
                  <button
                    key={item.href}
                    onClick={() => navigate(item.href)}
                    onMouseEnter={() => setSelectedIndex(globalIdx)}
                    className={`w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors ${
                      selectedIndex === globalIdx
                        ? 'bg-zinc-800/50 text-white'
                        : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-white'
                    }`}
                  >
                    <Icon size={15} strokeWidth={1.5} />
                    <span className="flex-1 text-left">{item.label}</span>
                    <ArrowRight size={14} className="text-zinc-600" />
                  </button>
                );
              })}
            </div>
          )}

          {/* Customers */}
          {customerItems.length > 0 && (
            <div>
              <p className="px-4 py-1.5 mt-1 text-[10px] font-semibold text-zinc-600 uppercase tracking-widest">
                Customers
              </p>
              {customerItems.map((item, i) => {
                const globalIdx = getGlobalIndex('customer', i);
                return (
                  <button
                    key={`customer-${i}`}
                    onClick={() => navigate(item.href)}
                    onMouseEnter={() => setSelectedIndex(globalIdx)}
                    className={`w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors ${
                      selectedIndex === globalIdx
                        ? 'bg-zinc-800/50 text-white'
                        : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-white'
                    }`}
                  >
                    <Users size={15} strokeWidth={1.5} />
                    <span className="flex-1 text-left">
                      {item.label}
                      {item.sublabel && (
                        <span className="ml-2 text-xs text-zinc-500">{item.sublabel}</span>
                      )}
                    </span>
                    <ArrowRight size={14} className="text-zinc-600" />
                  </button>
                );
              })}
            </div>
          )}

          {/* Reviews */}
          {reviewItems.length > 0 && (
            <div>
              <p className="px-4 py-1.5 mt-1 text-[10px] font-semibold text-zinc-600 uppercase tracking-widest">
                Reviews
              </p>
              {reviewItems.map((item, i) => {
                const globalIdx = getGlobalIndex('review', i);
                return (
                  <button
                    key={`review-${i}`}
                    onClick={() => navigate(item.href)}
                    onMouseEnter={() => setSelectedIndex(globalIdx)}
                    className={`w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors ${
                      selectedIndex === globalIdx
                        ? 'bg-zinc-800/50 text-white'
                        : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-white'
                    }`}
                  >
                    <Star size={15} strokeWidth={1.5} />
                    <span className="flex-1 text-left">
                      {item.label}
                      {item.sublabel && (
                        <span className="ml-2 text-xs text-zinc-500">{item.sublabel}</span>
                      )}
                    </span>
                    <ArrowRight size={14} className="text-zinc-600" />
                  </button>
                );
              })}
            </div>
          )}

          {/* Leads */}
          {leadItems.length > 0 && (
            <div>
              <p className="px-4 py-1.5 mt-1 text-[10px] font-semibold text-zinc-600 uppercase tracking-widest">
                Leads
              </p>
              {leadItems.map((item, i) => {
                const globalIdx = getGlobalIndex('lead', i);
                return (
                  <button
                    key={`lead-${i}`}
                    onClick={() => navigate(item.href)}
                    onMouseEnter={() => setSelectedIndex(globalIdx)}
                    className={`w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors ${
                      selectedIndex === globalIdx
                        ? 'bg-zinc-800/50 text-white'
                        : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-white'
                    }`}
                  >
                    <Building2 size={15} strokeWidth={1.5} />
                    <span className="flex-1 text-left">
                      {item.label}
                      {item.sublabel && (
                        <span className="ml-2 text-xs text-zinc-500">{item.sublabel}</span>
                      )}
                    </span>
                    <ArrowRight size={14} className="text-zinc-600" />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-4 px-4 py-2 border-t border-seat-border text-[11px] text-zinc-600">
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-[10px]">↑↓</kbd>
            navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-[10px]">↵</kbd>
            select
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-[10px]">esc</kbd>
            close
          </span>
        </div>
      </div>
    </div>
  );
}

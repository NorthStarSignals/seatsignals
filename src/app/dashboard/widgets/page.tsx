'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/utils';
import {
  BarChart3,
  Users,
  CalendarCheck,
  Star,
  UtensilsCrossed,
  ShoppingCart,
  UserCheck,
  Cloud,
  Target,
  CalendarDays,
  GripVertical,
  X,
  Plus,
  ChevronUp,
  ChevronDown,
  Save,
  RotateCcw,
  ChevronRight,
  Maximize2,
  Minimize2,
  LayoutGrid,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type WidgetSize = 'small' | 'medium' | 'large';

interface WidgetDefinition {
  id: string;
  name: string;
  icon: React.ElementType;
  defaultSize: WidgetSize;
  description: string;
}

interface PlacedWidget {
  instanceId: string;
  definitionId: string;
  size: WidgetSize;
}

// ---------------------------------------------------------------------------
// Widget catalogue
// ---------------------------------------------------------------------------

const WIDGET_CATALOGUE: WidgetDefinition[] = [
  { id: 'revenue-chart', name: 'Revenue Chart', icon: BarChart3, defaultSize: 'large', description: 'Daily revenue trend with bar chart' },
  { id: 'customer-count', name: 'Customer Count', icon: Users, defaultSize: 'small', description: 'Total unique customers today' },
  { id: 'todays-reservations', name: "Today's Reservations", icon: CalendarCheck, defaultSize: 'medium', description: 'Upcoming reservation list' },
  { id: 'review-score', name: 'Review Score', icon: Star, defaultSize: 'small', description: 'Average review rating' },
  { id: 'top-menu-items', name: 'Top Menu Items', icon: UtensilsCrossed, defaultSize: 'medium', description: 'Best-selling dishes today' },
  { id: 'recent-orders', name: 'Recent Orders', icon: ShoppingCart, defaultSize: 'medium', description: 'Latest order feed' },
  { id: 'staff-on-duty', name: 'Staff On Duty', icon: UserCheck, defaultSize: 'small', description: 'Currently clocked-in staff' },
  { id: 'weather-forecast', name: 'Weather Forecast', icon: Cloud, defaultSize: 'small', description: 'Local weather at a glance' },
  { id: 'goal-progress', name: 'Goal Progress', icon: Target, defaultSize: 'medium', description: 'Monthly revenue goal tracker' },
  { id: 'upcoming-events', name: 'Upcoming Events', icon: CalendarDays, defaultSize: 'medium', description: 'Scheduled events this week' },
];

const SIZE_LABELS: Record<WidgetSize, string> = { small: 'S', medium: 'M', large: 'L' };
const SIZE_SPANS: Record<WidgetSize, string> = {
  small: 'col-span-1',
  medium: 'col-span-1 md:col-span-2',
  large: 'col-span-1 md:col-span-3',
};

const NEXT_SIZE: Record<WidgetSize, WidgetSize> = { small: 'medium', medium: 'large', large: 'small' };

// ---------------------------------------------------------------------------
// Default layout (6 widgets)
// ---------------------------------------------------------------------------

function buildDefaults(): PlacedWidget[] {
  const defaults = ['revenue-chart', 'customer-count', 'review-score', 'todays-reservations', 'top-menu-items', 'goal-progress'];
  return defaults.map((id, i) => {
    const def = WIDGET_CATALOGUE.find(w => w.id === id)!;
    return { instanceId: `${id}-${i}`, definitionId: id, size: def.defaultSize };
  });
}

// ---------------------------------------------------------------------------
// Mock content renderers
// ---------------------------------------------------------------------------

function MockBars({ count, maxH }: { count: number; maxH: number }) {
  const heights = Array.from({ length: count }, (_, i) => 20 + Math.round(Math.abs(Math.sin(i * 1.8)) * (maxH - 20)));
  return (
    <div className="flex items-end gap-1 h-full">
      {heights.map((h, i) => (
        <div key={i} className="flex-1 rounded-sm bg-seat-red/70" style={{ height: `${h}%` }} />
      ))}
    </div>
  );
}

function MockList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1.5 text-sm text-zinc-400">
      {items.map((item, i) => (
        <li key={i} className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-seat-red shrink-0" />
          {item}
        </li>
      ))}
    </ul>
  );
}

function WidgetMockContent({ definitionId }: { definitionId: string }) {
  switch (definitionId) {
    case 'revenue-chart':
      return (
        <div className="space-y-2 h-32">
          <p className="text-2xl font-bold text-white">{formatCurrency(12480)}</p>
          <p className="text-xs text-emerald-400">+8.3% vs last week</p>
          <MockBars count={12} maxH={90} />
        </div>
      );
    case 'customer-count':
      return (
        <div className="flex flex-col items-center justify-center h-20">
          <p className="text-3xl font-bold text-white">247</p>
          <p className="text-xs text-zinc-400 mt-1">unique today</p>
        </div>
      );
    case 'todays-reservations':
      return <MockList items={['6:00 PM - Smith (4)', '6:30 PM - Johnson (2)', '7:00 PM - Williams (6)', '7:30 PM - Brown (3)']} />;
    case 'review-score':
      return (
        <div className="flex flex-col items-center justify-center h-20">
          <div className="flex items-center gap-1">
            <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
            <span className="text-3xl font-bold text-white">4.7</span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">from 38 reviews</p>
        </div>
      );
    case 'top-menu-items':
      return <MockList items={['Wagyu Burger - 42 sold', 'Truffle Fries - 38 sold', 'Caesar Salad - 31 sold', 'Lobster Bisque - 27 sold']} />;
    case 'recent-orders':
      return <MockList items={['#1042 - Table 7 - $86.50', '#1041 - Table 3 - $124.00', '#1040 - Delivery - $45.90', '#1039 - Table 12 - $67.20']} />;
    case 'staff-on-duty':
      return (
        <div className="flex flex-col items-center justify-center h-20">
          <p className="text-3xl font-bold text-white">14</p>
          <p className="text-xs text-zinc-400 mt-1">staff clocked in</p>
        </div>
      );
    case 'weather-forecast':
      return (
        <div className="flex flex-col items-center justify-center h-20">
          <p className="text-2xl font-bold text-white">72 F</p>
          <p className="text-xs text-zinc-400 mt-1">Partly cloudy</p>
        </div>
      );
    case 'goal-progress':
      return (
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-zinc-400">Monthly Goal</span>
            <span className="text-white font-medium">{formatCurrency(320000)}</span>
          </div>
          <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
            <div className="h-full bg-seat-red rounded-full" style={{ width: '68%' }} />
          </div>
          <p className="text-xs text-zinc-400">{formatCurrency(217600)} reached (68%)</p>
        </div>
      );
    case 'upcoming-events':
      return <MockList items={['Apr 10 - Wine Tasting Night', 'Apr 12 - Corporate Dinner (40 pax)', 'Apr 14 - Live Jazz Evening', 'Apr 16 - Chef\'s Table Experience']} />;
    default:
      return <p className="text-sm text-zinc-500">No preview available</p>;
  }
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function WidgetsPage() {
  const [placed, setPlaced] = useState<PlacedWidget[]>(buildDefaults);
  const [libraryOpen, setLibraryOpen] = useState(true);
  const [saved, setSaved] = useState(false);

  // Helpers
  const getDef = (id: string) => WIDGET_CATALOGUE.find(w => w.id === id)!;

  const addWidget = (defId: string) => {
    const def = getDef(defId);
    const instanceId = `${defId}-${Date.now()}`;
    setPlaced(prev => [...prev, { instanceId, definitionId: defId, size: def.defaultSize }]);
  };

  const removeWidget = (instanceId: string) => {
    setPlaced(prev => prev.filter(w => w.instanceId !== instanceId));
  };

  const toggleSize = (instanceId: string) => {
    setPlaced(prev =>
      prev.map(w => (w.instanceId === instanceId ? { ...w, size: NEXT_SIZE[w.size] } : w)),
    );
  };

  const moveWidget = (instanceId: string, direction: 'up' | 'down') => {
    setPlaced(prev => {
      const idx = prev.findIndex(w => w.instanceId === instanceId);
      if (idx < 0) return prev;
      const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= prev.length) return prev;
      const copy = [...prev];
      [copy[idx], copy[targetIdx]] = [copy[targetIdx], copy[idx]];
      return copy;
    });
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => {
    setPlaced(buildDefaults());
  };

  return (
    <div className="min-h-screen bg-seat-black text-white">
      {/* ---- Header ---- */}
      <header className="sticky top-0 z-30 border-b border-seat-border bg-seat-black/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <LayoutGrid className="h-6 w-6 text-seat-red" />
            <h1 className="text-xl font-bold tracking-tight">Customize Dashboard</h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleReset}
              className="flex items-center gap-2 rounded-lg border border-seat-border bg-seat-card px-4 py-2 text-sm font-medium text-zinc-300 transition hover:bg-zinc-800"
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </button>
            <button
              onClick={handleSave}
              className={cn(
                'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition',
                saved
                  ? 'bg-emerald-600 text-white'
                  : 'bg-seat-red text-white hover:bg-seat-red/90',
              )}
            >
              <Save className="h-4 w-4" />
              {saved ? 'Saved!' : 'Save Layout'}
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-6 space-y-6">
        {/* ---- Widget Library ---- */}
        <section className="rounded-xl border border-seat-border bg-seat-card">
          <button
            onClick={() => setLibraryOpen(o => !o)}
            className="flex w-full items-center justify-between px-5 py-4 text-left"
          >
            <div className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-seat-red" />
              <span className="font-semibold">Widget Library</span>
              <span className="ml-2 rounded-full bg-zinc-800 px-2.5 py-0.5 text-xs text-zinc-400">
                {WIDGET_CATALOGUE.length} available
              </span>
            </div>
            <ChevronRight
              className={cn('h-5 w-5 text-zinc-500 transition-transform', libraryOpen && 'rotate-90')}
            />
          </button>

          {libraryOpen && (
            <div className="grid grid-cols-1 gap-3 border-t border-seat-border px-5 pb-5 pt-4 sm:grid-cols-2 lg:grid-cols-5">
              {WIDGET_CATALOGUE.map(def => {
                const Icon = def.icon;
                return (
                  <div
                    key={def.id}
                    className="group flex flex-col justify-between rounded-lg border border-seat-border bg-zinc-900/60 p-4 transition hover:border-seat-red/50"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-seat-red" />
                        <span className="text-sm font-medium">{def.name}</span>
                      </div>
                      <p className="text-xs text-zinc-500 leading-relaxed">{def.description}</p>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="rounded bg-zinc-800 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-400">
                        {def.defaultSize}
                      </span>
                      <button
                        onClick={() => addWidget(def.id)}
                        className="flex items-center gap-1 rounded-md bg-seat-red/10 px-2.5 py-1 text-xs font-medium text-seat-red transition hover:bg-seat-red/20"
                      >
                        <Plus className="h-3 w-3" />
                        Add
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ---- Dashboard Preview Grid ---- */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Dashboard Preview</h2>
            <span className="text-sm text-zinc-500">{placed.length} widget{placed.length !== 1 ? 's' : ''} placed</span>
          </div>

          {placed.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-seat-border bg-seat-card py-20 text-center">
              <LayoutGrid className="h-10 w-10 text-zinc-600 mb-3" />
              <p className="text-zinc-400 text-sm">No widgets placed yet.</p>
              <p className="text-zinc-500 text-xs mt-1">Open the Widget Library above to add widgets.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {placed.map((widget, index) => {
                const def = getDef(widget.definitionId);
                const Icon = def.icon;
                return (
                  <div
                    key={widget.instanceId}
                    className={cn(
                      'group relative rounded-xl border border-seat-border bg-seat-card transition hover:border-zinc-600',
                      SIZE_SPANS[widget.size],
                    )}
                  >
                    {/* Card header */}
                    <div className="flex items-center justify-between border-b border-seat-border px-4 py-3">
                      <div className="flex items-center gap-2">
                        <GripVertical className="h-4 w-4 text-zinc-600" />
                        <Icon className="h-4 w-4 text-seat-red" />
                        <span className="text-sm font-medium">{def.name}</span>
                      </div>

                      <div className="flex items-center gap-1">
                        {/* Move up */}
                        <button
                          onClick={() => moveWidget(widget.instanceId, 'up')}
                          disabled={index === 0}
                          className="rounded p-1 text-zinc-500 transition hover:bg-zinc-800 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-zinc-500"
                          title="Move up"
                        >
                          <ChevronUp className="h-4 w-4" />
                        </button>
                        {/* Move down */}
                        <button
                          onClick={() => moveWidget(widget.instanceId, 'down')}
                          disabled={index === placed.length - 1}
                          className="rounded p-1 text-zinc-500 transition hover:bg-zinc-800 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-zinc-500"
                          title="Move down"
                        >
                          <ChevronDown className="h-4 w-4" />
                        </button>
                        {/* Size toggle */}
                        <button
                          onClick={() => toggleSize(widget.instanceId)}
                          className="flex items-center gap-1 rounded px-1.5 py-1 text-xs font-medium text-zinc-400 transition hover:bg-zinc-800 hover:text-white"
                          title={`Size: ${widget.size} - click to cycle`}
                        >
                          {widget.size === 'small' ? (
                            <Minimize2 className="h-3.5 w-3.5" />
                          ) : (
                            <Maximize2 className="h-3.5 w-3.5" />
                          )}
                          {SIZE_LABELS[widget.size]}
                        </button>
                        {/* Remove */}
                        <button
                          onClick={() => removeWidget(widget.instanceId)}
                          className="rounded p-1 text-zinc-500 transition hover:bg-red-900/40 hover:text-seat-red"
                          title="Remove widget"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Card body */}
                    <div className="p-4">
                      <WidgetMockContent definitionId={widget.definitionId} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

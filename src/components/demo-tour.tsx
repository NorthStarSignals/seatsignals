'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { ChevronLeft, ChevronRight, X, Sparkles, PlayCircle } from 'lucide-react';

// The 30 hero pages of the SeatSignals demo path.
// Each step is a focused message about what makes that page valuable.
const TOUR_STEPS = [
  { path: '/dashboard', title: '🏠 Mission Control', body: 'Your entire restaurant on one screen. Live revenue, covers, sentiment, and AI alerts the moment they happen.' },
  { path: '/dashboard/intelligence', title: '🧠 Signal IQ', body: 'AI watches your data 24/7 and surfaces actions: a server slipping, a menu item underperforming, a guest worth a comp.' },
  { path: '/dashboard/ask', title: '💬 Ask AI Anything', body: 'Natural-language queries on your business. "What was last Tuesday\'s busiest hour?" Done.' },
  { path: '/dashboard/customers', title: '👥 Unified Customer Profile', body: 'Every guest, every visit, every preference — auto-deduped from POS, reservations, WiFi, and online orders.' },
  { path: '/dashboard/segments', title: '🎯 Smart Segments', body: 'Slice your guests by behavior: lapsed VIPs, big spenders, allergy guests. One click to message them.' },
  { path: '/dashboard/reviews', title: '⭐ Reputation Inbox', body: 'Yelp, Google, TripAdvisor — all in one stream. Sentiment auto-tagged.' },
  { path: '/dashboard/ai/sentiment-responder', title: '✨ AI Sentiment Reply', body: 'Generate tone-perfect responses to every review in seconds. Trained on YOUR brand voice.' },
  { path: '/dashboard/reservations', title: '📅 Reservations', body: 'Bookings, walk-ins, waitlist, and capacity in one calendar. Intelligently routes parties to the right table.' },
  { path: '/dashboard/reservations/no-shows', title: '🚫 No-Show Prevention', body: 'AI scores reservations for no-show risk. Auto-deposit prompts cut no-shows by 70%.' },
  { path: '/dashboard/reservations/capacity', title: '📊 Capacity Optimizer', body: 'See exactly which hours and sections are over- or under-booked. Maximize covers without overwhelming the line.' },
  { path: '/dashboard/tables', title: '🪑 Floor Plan', body: 'Drag-and-drop floor management. Real-time table status, server assignments, turn times.' },
  { path: '/dashboard/kitchen', title: '🍳 Kitchen Display System', body: 'Tickets fire by station. Speed of service tracked per ticket. Auto-86 menu items when inventory runs out.' },
  { path: '/dashboard/menu', title: '🍽️ Menu Manager', body: 'Sync once, deploy everywhere: in-house, delivery, online ordering, third-party apps.' },
  { path: '/dashboard/analytics/food-cost', title: '💰 Food Cost & Profitability', body: 'See what\'s making money vs what\'s just moving volume. The #1 lever most operators miss.' },
  { path: '/dashboard/inventory', title: '📦 Inventory', body: 'Live counts, automatic depletion from sales, par-level alerts before you run out.' },
  { path: '/dashboard/inventory/par-levels', title: '🚨 Par Level Alerts', body: 'Never run out, never overstock. AI sets pars based on velocity and weather forecasts.' },
  { path: '/dashboard/inventory/waste-log', title: '🗑️ Waste Tracking', body: 'Log every comp, void, and dump. Find the leak. Most restaurants discover 4-6% margin hiding here.' },
  { path: '/dashboard/staff/schedule', title: '👨‍🍳 Smart Scheduling', body: 'Drag-and-drop schedules with labor cost projections, overtime warnings, and weather-aware staffing.' },
  { path: '/dashboard/analytics/labor-cost', title: '⏱️ Labor Cost Analysis', body: 'Hour-by-hour labor vs revenue. See exactly where you\'re overstaffed.' },
  { path: '/dashboard/email-campaigns', title: '📧 Email Campaigns', body: 'Templated drag-and-drop builder. AI writes subject lines that get opened.' },
  { path: '/dashboard/dead-hours', title: '🌙 Dead Hour Optimizer', body: 'Auto-trigger flash deals during slow periods. Average 23% revenue lift in dead zones.' },
  { path: '/dashboard/birthdays', title: '🎂 Birthday Automation', body: 'Personalized birthday offers fire 7 days before. Highest-converting touchpoint in restaurants.' },
  { path: '/dashboard/loyalty', title: '🏆 Loyalty Program', body: 'Points, tiers, rewards. Built-in. No third-party required. One unified guest record.' },
  { path: '/dashboard/loyalty', title: '🎁 Referral Engine', body: 'Members invite friends. Both get rewarded. Tracks every step from invite to first visit. (See the Referrals tab)' },
  { path: '/dashboard/catering', title: '🎉 Catering Lead Gen', body: 'Auto-finds nearby offices and pitches them via email. Pro plan converts 8-12 leads/month avg.' },
  { path: '/dashboard/analytics/revenue-forecast', title: '📈 Revenue Forecasting', body: 'AI forecasts next week\'s revenue with weather, holidays, and historic patterns. Plan staff & prep accordingly.' },
  { path: '/dashboard/weather', title: '🌦️ Weather Impact', body: 'How rainy days actually affect your business. Plan promos for the slumps.' },
  { path: '/dashboard/locations/compare', title: '🏢 Multi-Location View', body: 'For groups: compare any metric across all your restaurants instantly. Find the outliers.' },
  { path: '/dashboard/reports/daily-closing', title: '📋 Daily Closing Report', body: 'End-of-day report auto-generated and emailed. Cash, sales, tips, checklist — done in one click.' },
];

const STORAGE_KEY = 'seatsignals_demo_tour_state';

export function DemoTour() {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const [showLauncher, setShowLauncher] = useState(true);

  // Load state on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        setStepIdx(s.stepIdx || 0);
        setShowLauncher(!s.dismissed);
      }
    } catch {}
  }, []);

  // Persist
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ stepIdx, dismissed: !showLauncher }));
    } catch {}
  }, [stepIdx, showLauncher]);

  const step = TOUR_STEPS[stepIdx];
  const onCorrectPage = pathname === step?.path || pathname?.startsWith(step?.path + '/');

  const start = () => {
    setOpen(true);
    setStepIdx(0);
    if (TOUR_STEPS[0].path !== pathname) router.push(TOUR_STEPS[0].path);
  };

  const next = () => {
    if (stepIdx < TOUR_STEPS.length - 1) {
      const newIdx = stepIdx + 1;
      setStepIdx(newIdx);
      const target = TOUR_STEPS[newIdx].path;
      if (target !== pathname) router.push(target);
    } else {
      setOpen(false);
    }
  };

  const prev = () => {
    if (stepIdx > 0) {
      const newIdx = stepIdx - 1;
      setStepIdx(newIdx);
      const target = TOUR_STEPS[newIdx].path;
      if (target !== pathname) router.push(target);
    }
  };

  const close = () => {
    setOpen(false);
  };

  const dismissLauncher = () => {
    setShowLauncher(false);
  };

  // Floating launcher button (when tour not open)
  if (!open) {
    if (!showLauncher) return null;
    return (
      <button
        onClick={start}
        className="fixed bottom-6 right-6 z-50 bg-seat-red hover:bg-seat-red/90 text-white px-5 py-3 rounded-full shadow-2xl shadow-seat-red/40 flex items-center gap-2 font-semibold text-sm border border-seat-red/50 group"
      >
        <PlayCircle className="w-5 h-5" />
        Take the Tour
        <button
          onClick={(e) => { e.stopPropagation(); dismissLauncher(); }}
          className="ml-2 opacity-60 hover:opacity-100"
          aria-label="Dismiss tour launcher"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </button>
    );
  }

  // Tour active — overlay panel
  return (
    <>
      {/* Dim backdrop */}
      <div className="fixed inset-0 bg-black/60 z-40 pointer-events-none" />

      {/* Tour card */}
      <div className="fixed bottom-6 right-6 z-50 w-[360px] bg-seat-card border border-seat-red rounded-2xl shadow-2xl shadow-seat-red/30 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-seat-red/20 to-transparent p-4 border-b border-seat-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-seat-red" />
            <span className="text-xs font-semibold text-seat-red uppercase tracking-wider">
              Step {stepIdx + 1} of {TOUR_STEPS.length}
            </span>
          </div>
          <button onClick={close} className="text-zinc-500 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5">
          <h3 className="text-lg font-bold text-white mb-2">{step.title}</h3>
          <p className="text-sm text-zinc-400 leading-relaxed mb-4">{step.body}</p>

          {!onCorrectPage && (
            <div className="text-xs text-yellow-500 mb-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-2">
              Loading page...
            </div>
          )}

          {/* Progress bar */}
          <div className="h-1 bg-seat-black rounded-full overflow-hidden mb-4">
            <div
              className="h-full bg-seat-red transition-all"
              style={{ width: `${((stepIdx + 1) / TOUR_STEPS.length) * 100}%` }}
            />
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={prev}
              disabled={stepIdx === 0}
              className="px-3 py-2 text-sm text-zinc-400 hover:text-white disabled:opacity-30 flex items-center gap-1"
            >
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
            <button
              onClick={close}
              className="text-xs text-zinc-500 hover:text-white"
            >
              Skip
            </button>
            <button
              onClick={next}
              className="px-4 py-2 bg-seat-red hover:bg-seat-red/90 text-white rounded-lg text-sm font-medium flex items-center gap-1"
            >
              {stepIdx === TOUR_STEPS.length - 1 ? 'Finish' : 'Next'}
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

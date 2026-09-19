'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addMonths, subMonths, isSameDay, isBefore, isAfter, isWithinInterval, startOfDay, subDays, startOfQuarter, startOfYear } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DateRange {
  from: Date;
  to: Date;
}

interface Preset {
  label: string;
  range: () => DateRange;
}

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  presets?: Preset[];
  className?: string;
}

const today = () => startOfDay(new Date());

const defaultPresets: Preset[] = [
  { label: 'Today', range: () => ({ from: today(), to: today() }) },
  { label: 'Last 7 days', range: () => ({ from: subDays(today(), 6), to: today() }) },
  { label: 'Last 30 days', range: () => ({ from: subDays(today(), 29), to: today() }) },
  { label: 'Last 90 days', range: () => ({ from: subDays(today(), 89), to: today() }) },
  {
    label: 'This month',
    range: () => ({ from: startOfMonth(today()), to: today() }),
  },
  {
    label: 'Last month',
    range: () => {
      const prev = subMonths(today(), 1);
      return { from: startOfMonth(prev), to: endOfMonth(prev) };
    },
  },
  {
    label: 'This quarter',
    range: () => ({ from: startOfQuarter(today()), to: today() }),
  },
  {
    label: 'This year',
    range: () => ({ from: startOfYear(today()), to: today() }),
  },
];

function formatDisplay(range: DateRange): string {
  const f = format(range.from, 'MMM d');
  const t = format(range.to, 'MMM d, yyyy');
  if (isSameDay(range.from, range.to)) return format(range.from, 'MMM d, yyyy');
  if (range.from.getFullYear() !== range.to.getFullYear()) {
    return `${format(range.from, 'MMM d, yyyy')} – ${t}`;
  }
  return `${f} – ${t}`;
}

// ─── Calendar Month ──────────────────────────────────────────────────────────

function CalendarMonth({
  month,
  rangeStart,
  rangeEnd,
  hoverDate,
  onDayClick,
  onDayHover,
}: {
  month: Date;
  rangeStart: Date | null;
  rangeEnd: Date | null;
  hoverDate: Date | null;
  onDayClick: (d: Date) => void;
  onDayHover: (d: Date | null) => void;
}) {
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const days: Date[] = [];
  let cursor = calStart;
  while (cursor <= calEnd) {
    days.push(cursor);
    cursor = new Date(cursor.getTime() + 86_400_000);
  }

  // Determine the effective selection range for highlighting
  const effectiveEnd = rangeEnd ?? hoverDate;
  let selFrom: Date | null = null;
  let selTo: Date | null = null;
  if (rangeStart && effectiveEnd) {
    selFrom = isBefore(rangeStart, effectiveEnd) ? rangeStart : effectiveEnd;
    selTo = isAfter(rangeStart, effectiveEnd) ? rangeStart : effectiveEnd;
  }

  return (
    <div className="w-[252px]">
      <p className="text-sm font-medium text-white text-center mb-2">
        {format(month, 'MMMM yyyy')}
      </p>
      <div className="grid grid-cols-7 gap-0 text-center text-[11px] text-zinc-500 mb-1">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
          <span key={d} className="h-7 flex items-center justify-center">{d}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0">
        {days.map((day, i) => {
          const inMonth = day.getMonth() === month.getMonth();
          const isStart = rangeStart && isSameDay(day, rangeStart);
          const isEnd = (rangeEnd && isSameDay(day, rangeEnd)) || (!rangeEnd && hoverDate && isSameDay(day, hoverDate) && rangeStart);
          const inRange =
            selFrom && selTo && inMonth
              ? isWithinInterval(day, { start: selFrom, end: selTo })
              : false;

          return (
            <button
              key={i}
              type="button"
              onClick={() => inMonth && onDayClick(day)}
              onMouseEnter={() => inMonth && onDayHover(day)}
              onMouseLeave={() => onDayHover(null)}
              className={cn(
                'h-8 w-9 text-xs rounded-md transition-colors',
                !inMonth && 'text-zinc-700 cursor-default',
                inMonth && !inRange && !isStart && !isEnd && 'text-zinc-300 hover:bg-zinc-700',
                inRange && !isStart && !isEnd && 'bg-seat-red/15 text-white',
                (isStart || isEnd) && 'bg-seat-red text-white font-semibold',
              )}
              disabled={!inMonth}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function DateRangePicker({
  value,
  onChange,
  presets,
  className,
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(startOfMonth(value.from));
  const [rangeStart, setRangeStart] = useState<Date | null>(null);
  const [hoverDate, setHoverDate] = useState<Date | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const activePresets = presets ?? defaultPresets;

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setRangeStart(null);
      }
    }
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleDayClick = useCallback(
    (day: Date) => {
      if (!rangeStart) {
        setRangeStart(day);
        return;
      }
      // Build range: ensure from < to
      const from = isBefore(day, rangeStart) ? day : rangeStart;
      const to = isAfter(day, rangeStart) ? day : rangeStart;
      onChange({ from, to });
      setRangeStart(null);
      setOpen(false);
    },
    [rangeStart, onChange],
  );

  const handlePreset = useCallback(
    (preset: Preset) => {
      const range = preset.range();
      onChange(range);
      setViewMonth(startOfMonth(range.from));
      setRangeStart(null);
      setOpen(false);
    },
    [onChange],
  );

  return (
    <div ref={containerRef} className={cn('relative inline-block', className)}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-2 h-9 px-3 text-sm text-zinc-300 bg-zinc-900 border border-zinc-700 rounded-lg hover:border-zinc-500 transition-colors"
      >
        <Calendar className="w-4 h-4 text-zinc-500" />
        <span>{formatDisplay(value)}</span>
      </button>

      {/* Popover */}
      {open && (
        <div className="absolute z-50 mt-2 left-0 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl p-4 flex gap-4">
          {/* Presets sidebar */}
          <div className="flex flex-col gap-1 border-r border-zinc-800 pr-4 min-w-[130px]">
            <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-1">Presets</p>
            {activePresets.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => handlePreset(p)}
                className="text-left text-xs text-zinc-400 hover:text-white hover:bg-zinc-800 px-2 py-1.5 rounded-md transition-colors"
              >
                {p.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setRangeStart(null)}
              className="text-left text-xs text-seat-red hover:bg-seat-red/10 px-2 py-1.5 rounded-md transition-colors mt-1"
            >
              Custom
            </button>
          </div>

          {/* Calendars */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <button
                type="button"
                onClick={() => setViewMonth(subMonths(viewMonth, 1))}
                className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMonth(addMonths(viewMonth, 1))}
                className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <div className="flex gap-6">
              <CalendarMonth
                month={viewMonth}
                rangeStart={rangeStart ?? value.from}
                rangeEnd={rangeStart ? null : value.to}
                hoverDate={hoverDate}
                onDayClick={handleDayClick}
                onDayHover={setHoverDate}
              />
              <CalendarMonth
                month={addMonths(viewMonth, 1)}
                rangeStart={rangeStart ?? value.from}
                rangeEnd={rangeStart ? null : value.to}
                hoverDate={hoverDate}
                onDayClick={handleDayClick}
                onDayHover={setHoverDate}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

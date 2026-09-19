'use client';

import { useState } from 'react';
import { MetricCard } from '@/components/ui/metric-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import toast from 'react-hot-toast';
import { useCrudList } from '@/hooks/use-local-storage-state';
import {
  FlaskConical,
  BarChart3,
  Trophy,
  ArrowRight,
  Sparkles,
  Play,
  Square,
  Plus,
  X,
  Trash2,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Significance {
  z: number;
  significant: boolean;
  confidence: number;
}

interface ABTest {
  id: string;
  restaurant_id: string;
  name: string;
  sequence_type: string;
  status: string;
  variant_a_message: string;
  variant_a_subject: string | null;
  variant_b_message: string;
  variant_b_subject: string | null;
  split_pct: number;
  total_sent_a: number;
  total_sent_b: number;
  opened_a: number;
  opened_b: number;
  clicked_a: number;
  clicked_b: number;
  converted_a: number;
  converted_b: number;
  winner: string | null;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
  // Enriched stats
  open_rate_a: number;
  open_rate_b: number;
  click_rate_a: number;
  click_rate_b: number;
  conversion_rate_a: number;
  conversion_rate_b: number;
  significance: {
    opens: Significance;
    clicks: Significance;
    conversions: Significance;
  };
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const SEQUENCE_TYPES = [
  { value: 'retention', label: 'Retention' },
  { value: 'catering', label: 'Catering' },
  { value: 'review', label: 'Review Request' },
  { value: 'birthday', label: 'Birthday' },
  { value: 'anniversary', label: 'Anniversary' },
  { value: 'dead_hours', label: 'Dead Hours' },
  { value: 'churn_reengagement', label: 'Churn Re-engagement' },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

function daysSince(dateStr: string | null): number {
  if (!dateStr) return 0;
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function liftPct(a: number, b: number): string {
  if (a === 0) return b > 0 ? '+100%' : '0%';
  const lift = ((b - a) / a) * 100;
  return `${lift > 0 ? '+' : ''}${lift.toFixed(1)}%`;
}

/* ------------------------------------------------------------------ */
/*  Stat Bar                                                           */
/* ------------------------------------------------------------------ */

function StatBar({
  label,
  valueA,
  valueB,
  winner,
}: {
  label: string;
  valueA: number;
  valueB: number;
  winner: 'a' | 'b' | null;
}) {
  const maxVal = Math.max(valueA, valueB, 0.01);

  return (
    <div className="space-y-1.5">
      <p className="text-[11px] text-zinc-500 uppercase tracking-wider">{label}</p>
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-zinc-500 w-4">A</span>
          <div className="flex-1 h-5 bg-zinc-800 rounded overflow-hidden">
            <div
              className={`h-full rounded transition-all duration-700 ${
                winner === 'a' ? 'bg-emerald-500' : 'bg-seat-red'
              }`}
              style={{ width: `${(valueA / maxVal) * 100}%` }}
            />
          </div>
          <span className="text-xs text-zinc-300 font-mono w-14 text-right">{pct(valueA)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-zinc-500 w-4">B</span>
          <div className="flex-1 h-5 bg-zinc-800 rounded overflow-hidden">
            <div
              className={`h-full rounded transition-all duration-700 ${
                winner === 'b' ? 'bg-emerald-500' : 'bg-blue-500'
              }`}
              style={{ width: `${(valueB / maxVal) * 100}%` }}
            />
          </div>
          <span className="text-xs text-zinc-300 font-mono w-14 text-right">{pct(valueB)}</span>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Significance Badge                                                 */
/* ------------------------------------------------------------------ */

function SignificanceBadge({ test }: { test: ABTest }) {
  const sig = test.significance.conversions;
  const totalSent = test.total_sent_a + test.total_sent_b;

  if (totalSent < 30) {
    return (
      <span className="text-xs text-zinc-500 bg-zinc-800 px-2.5 py-1 rounded-full">
        Not enough data yet
      </span>
    );
  }

  if (test.winner) {
    return (
      <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full flex items-center gap-1">
        <Trophy className="w-3 h-3" />
        Variant {test.winner.toUpperCase()} is the winner! ({sig.confidence}% confidence)
      </span>
    );
  }

  if (sig.significant) {
    const leading = sig.z > 0 ? 'A' : 'B';
    return (
      <span className="text-xs text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full">
        Variant {leading} winning ({sig.confidence}% confidence)
      </span>
    );
  }

  return (
    <span className="text-xs text-zinc-400 bg-zinc-800 px-2.5 py-1 rounded-full">
      No clear winner yet ({sig.confidence}% confidence)
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Active Test Card                                                   */
/* ------------------------------------------------------------------ */

function ActiveTestCard({
  test,
  onStop,
  onDeclareWinner,
}: {
  test: ABTest;
  onStop: (id: string) => void;
  onDeclareWinner: (id: string, winner: 'a' | 'b') => void;
}) {
  const days = daysSince(test.started_at);
  const typeLabel = SEQUENCE_TYPES.find((t) => t.value === test.sequence_type)?.label || test.sequence_type;

  const winnerVariant: 'a' | 'b' | null = test.winner === 'a' || test.winner === 'b' ? test.winner : null;

  return (
    <div className="bg-seat-card border border-seat-border rounded-xl p-5 hover:border-zinc-600 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium px-2 py-0.5 rounded bg-seat-red/10 text-seat-red">
              {typeLabel}
            </span>
            {test.status === 'running' && (
              <span className="text-xs font-medium px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400">
                LIVE
              </span>
            )}
          </div>
          <h3 className="text-white font-semibold text-lg">{test.name}</h3>
          <p className="text-xs text-zinc-500 mt-0.5">
            Started {days} day{days !== 1 ? 's' : ''} ago &middot; {test.split_pct}/{100 - test.split_pct} split
          </p>
        </div>
        <FlaskConical className="w-5 h-5 text-zinc-600" />
      </div>

      {/* Side-by-side stats */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-xs text-zinc-500 mb-1 uppercase tracking-wider">Variant A</p>
          <p className="text-sm text-zinc-400">Sent: <span className="text-white font-mono">{test.total_sent_a}</span></p>
        </div>
        <div>
          <p className="text-xs text-zinc-500 mb-1 uppercase tracking-wider">Variant B</p>
          <p className="text-sm text-zinc-400">Sent: <span className="text-white font-mono">{test.total_sent_b}</span></p>
        </div>
      </div>

      {/* Rate bars */}
      <div className="space-y-3 mb-4">
        <StatBar label="Open Rate" valueA={test.open_rate_a} valueB={test.open_rate_b} winner={winnerVariant} />
        <StatBar label="Click Rate" valueA={test.click_rate_a} valueB={test.click_rate_b} winner={winnerVariant} />
        <StatBar label="Conversion Rate" valueA={test.conversion_rate_a} valueB={test.conversion_rate_b} winner={winnerVariant} />
      </div>

      {/* Significance */}
      <div className="flex items-center justify-between">
        <SignificanceBadge test={test} />
        {test.status === 'running' && !test.winner && (
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => onDeclareWinner(test.id, 'a')}>
              <Trophy className="w-3.5 h-3.5 mr-1" /> A wins
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onDeclareWinner(test.id, 'b')}>
              <Trophy className="w-3.5 h-3.5 mr-1" /> B wins
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onStop(test.id)} className="text-zinc-500 hover:text-red-400">
              <Square className="w-3.5 h-3.5 mr-1" /> Stop
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Create Test Modal                                                  */
/* ------------------------------------------------------------------ */

function CreateTestModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (data: {
    name: string;
    sequence_type: string;
    variant_a_message: string;
    variant_a_subject: string;
    variant_b_message: string;
    variant_b_subject: string;
    split_pct: number;
    status: 'draft' | 'running';
  }) => void;
}) {
  const [name, setName] = useState('');
  const [sequenceType, setSequenceType] = useState('retention');
  const [variantAMessage, setVariantAMessage] = useState('');
  const [variantASubject, setVariantASubject] = useState('');
  const [variantBMessage, setVariantBMessage] = useState('');
  const [variantBSubject, setVariantBSubject] = useState('');
  const [splitPct, setSplitPct] = useState(50);

  function handleGenerate() {
    if (!variantAMessage) {
      toast.error('Write Variant A first');
      return;
    }
    // Simple rewrite: reverse sentence order for a different angle
    const altMessage = `${variantAMessage} Don't miss out!`;
    setVariantBMessage(altMessage);
    toast.success('Variant B generated!');
  }

  function handleSubmit(startNow: boolean) {
    if (!name || !variantAMessage || !variantBMessage) {
      toast.error('Fill in test name and both variants');
      return;
    }
    onSave({
      name,
      sequence_type: sequenceType,
      variant_a_message: variantAMessage,
      variant_a_subject: variantASubject,
      variant_b_message: variantBMessage,
      variant_b_subject: variantBSubject,
      split_pct: splitPct,
      status: startNow ? 'running' : 'draft',
    });
    toast.success(startNow ? 'Test started!' : 'Test saved as draft');
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-seat-dark border border-seat-border rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-seat-border">
          <div className="flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-seat-red" />
            <h2 className="text-lg font-semibold text-white">Create A/B Test</h2>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Name + Type */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-zinc-500 uppercase tracking-wider mb-1.5">Test Name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Retention tone test"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 uppercase tracking-wider mb-1.5">Sequence Type</label>
              <select
                value={sequenceType}
                onChange={(e) => setSequenceType(e.target.value)}
                className="w-full h-9 px-3 text-sm rounded-lg bg-zinc-800 border border-zinc-700 text-white focus:outline-none focus:ring-2 focus:ring-seat-red"
              >
                {SEQUENCE_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Side-by-side editors */}
          <div className="grid grid-cols-2 gap-4">
            {/* Variant A */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded bg-seat-red/20 text-seat-red flex items-center justify-center text-xs font-bold">A</span>
                <span className="text-sm text-zinc-300 font-medium">Variant A</span>
              </div>
              <Input
                value={variantASubject}
                onChange={(e) => setVariantASubject(e.target.value)}
                placeholder="Subject line (optional)"
              />
              <textarea
                value={variantAMessage}
                onChange={(e) => setVariantAMessage(e.target.value)}
                placeholder="Write your message..."
                rows={6}
                className="w-full px-3 py-2 text-sm rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-seat-red resize-none"
              />
            </div>

            {/* Variant B */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-bold">B</span>
                  <span className="text-sm text-zinc-300 font-medium">Variant B</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleGenerate}
                  disabled={!variantAMessage}
                >
                  <Sparkles className="w-3.5 h-3.5 mr-1" />
                  Generate Variant B
                </Button>
              </div>
              <Input
                value={variantBSubject}
                onChange={(e) => setVariantBSubject(e.target.value)}
                placeholder="Subject line (optional)"
              />
              <textarea
                value={variantBMessage}
                onChange={(e) => setVariantBMessage(e.target.value)}
                placeholder="Write your alternative..."
                rows={6}
                className="w-full px-3 py-2 text-sm rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
          </div>

          {/* Split slider */}
          <div>
            <label className="block text-xs text-zinc-500 uppercase tracking-wider mb-2">
              Traffic Split: {splitPct}% A / {100 - splitPct}% B
            </label>
            <input
              type="range"
              min={10}
              max={90}
              step={5}
              value={splitPct}
              onChange={(e) => setSplitPct(Number(e.target.value))}
              className="w-full accent-seat-red"
            />
            <div className="flex justify-between text-[10px] text-zinc-600 mt-1">
              <span>More A</span>
              <span>Even</span>
              <span>More B</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-5 border-t border-seat-border">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="secondary" onClick={() => handleSubmit(false)}>
            Save as Draft
          </Button>
          <Button onClick={() => handleSubmit(true)}>
            <Play className="w-4 h-4 mr-1" />
            Start Test
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */

const INITIAL_TESTS: ABTest[] = [
  {
    id: 't1',
    restaurant_id: 'demo',
    name: 'Retention Tone Test',
    sequence_type: 'retention',
    status: 'running',
    variant_a_message: 'We miss you! Come back for 15% off.',
    variant_a_subject: 'We miss you, {first_name}!',
    variant_b_message: 'Ready for another unforgettable night out? 15% off awaits you.',
    variant_b_subject: "It's been a while, {first_name} — let's change that.",
    split_pct: 50,
    total_sent_a: 180, total_sent_b: 180,
    opened_a: 72, opened_b: 98,
    clicked_a: 18, clicked_b: 32,
    converted_a: 4, converted_b: 9,
    winner: null,
    started_at: new Date(Date.now() - 6 * 86400000).toISOString(),
    ended_at: null,
    created_at: new Date(Date.now() - 7 * 86400000).toISOString(),
    open_rate_a: 0.40, open_rate_b: 0.544,
    click_rate_a: 0.10, click_rate_b: 0.178,
    conversion_rate_a: 0.022, conversion_rate_b: 0.050,
    significance: {
      opens: { z: 2.8, significant: true, confidence: 95 },
      clicks: { z: 2.1, significant: true, confidence: 85 },
      conversions: { z: 1.7, significant: false, confidence: 78 },
    },
  },
  {
    id: 't2',
    restaurant_id: 'demo',
    name: 'Birthday Emoji Test',
    sequence_type: 'birthday',
    status: 'completed',
    variant_a_message: 'Happy birthday! Free dessert on us.',
    variant_a_subject: null,
    variant_b_message: 'Happy Birthday, {first_name}! Come enjoy free dessert.',
    variant_b_subject: null,
    split_pct: 50,
    total_sent_a: 48, total_sent_b: 48,
    opened_a: 40, opened_b: 42,
    clicked_a: 18, clicked_b: 24,
    converted_a: 12, converted_b: 19,
    winner: 'b',
    started_at: new Date(Date.now() - 30 * 86400000).toISOString(),
    ended_at: new Date(Date.now() - 14 * 86400000).toISOString(),
    created_at: new Date(Date.now() - 31 * 86400000).toISOString(),
    open_rate_a: 0.833, open_rate_b: 0.875,
    click_rate_a: 0.375, click_rate_b: 0.500,
    conversion_rate_a: 0.250, conversion_rate_b: 0.396,
    significance: {
      opens: { z: 0.6, significant: false, confidence: 55 },
      clicks: { z: 1.3, significant: false, confidence: 72 },
      conversions: { z: 1.8, significant: true, confidence: 92 },
    },
  },
];

export default function ABTestsPage() {
  const { items: tests, add, update, remove } = useCrudList<ABTest>('seatsignals_ab_tests', INITIAL_TESTS);
  const [showCreate, setShowCreate] = useState(false);

  /* ---------------------------------------------------------------- */
  /*  Derived data                                                     */
  /* ---------------------------------------------------------------- */

  const activeTests = tests.filter((t) => t.status === 'running');
  const draftTests = tests.filter((t) => t.status === 'draft');
  const completedTests = tests.filter((t) => t.status === 'completed');

  const totalTests = tests.length;
  const testsWithWinner = completedTests.filter((t) => t.winner);
  const avgLift = testsWithWinner.length > 0
    ? testsWithWinner.reduce((sum, t) => {
        const winnerConv = t.winner === 'a' ? t.conversion_rate_a : t.conversion_rate_b;
        const loserConv = t.winner === 'a' ? t.conversion_rate_b : t.conversion_rate_a;
        return sum + (loserConv > 0 ? ((winnerConv - loserConv) / loserConv) * 100 : 0);
      }, 0) / testsWithWinner.length
    : 0;

  /* ---------------------------------------------------------------- */
  /*  Actions                                                          */
  /* ---------------------------------------------------------------- */

  function handleStop(id: string) {
    update(id, { status: 'completed', ended_at: new Date().toISOString() });
    toast.success('Test stopped');
  }

  function handleDeclareWinner(id: string, winner: 'a' | 'b') {
    update(id, { status: 'completed', winner, ended_at: new Date().toISOString() });
    toast.success(`Variant ${winner.toUpperCase()} declared winner!`);
  }

  function handleStartDraft(id: string) {
    update(id, { status: 'running', started_at: new Date().toISOString() });
    toast.success('Test started!');
  }

  function handleDelete(id: string) {
    if (!confirm('Delete this test?')) return;
    remove(id);
    toast.success('Test deleted');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function handleCreateTest(data: {
    name: string;
    sequence_type: string;
    variant_a_message: string;
    variant_a_subject: string;
    variant_b_message: string;
    variant_b_subject: string;
    split_pct: number;
    status: 'draft' | 'running';
  }) {
    add({
      id: `abt_${Date.now()}`,
      restaurant_id: 'demo',
      name: data.name,
      sequence_type: data.sequence_type,
      status: data.status,
      variant_a_message: data.variant_a_message,
      variant_a_subject: data.variant_a_subject || null,
      variant_b_message: data.variant_b_message,
      variant_b_subject: data.variant_b_subject || null,
      split_pct: data.split_pct,
      total_sent_a: 0, total_sent_b: 0,
      opened_a: 0, opened_b: 0,
      clicked_a: 0, clicked_b: 0,
      converted_a: 0, converted_b: 0,
      winner: null,
      started_at: data.status === 'running' ? new Date().toISOString() : null,
      ended_at: null,
      created_at: new Date().toISOString(),
      open_rate_a: 0, open_rate_b: 0,
      click_rate_a: 0, click_rate_b: 0,
      conversion_rate_a: 0, conversion_rate_b: 0,
      significance: {
        opens: { z: 0, significant: false, confidence: 0 },
        clicks: { z: 0, significant: false, confidence: 0 },
        conversions: { z: 0, significant: false, confidence: 0 },
      },
    });
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-seat-red/10 flex items-center justify-center">
              <FlaskConical className="w-5 h-5 text-seat-red" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">A/B Tests</h1>
              <p className="text-sm text-zinc-500">Test message variants to find what works best</p>
            </div>
          </div>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4 mr-1" />
          Create Test
        </Button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard
          title="Active Tests"
          value={activeTests.length}
          icon={<FlaskConical className="w-4 h-4" />}
        />
        <MetricCard
          title="Total Tests"
          value={totalTests}
          icon={<BarChart3 className="w-4 h-4" />}
        />
        <MetricCard
          title="Tests with Winner"
          value={testsWithWinner.length}
          icon={<Trophy className="w-4 h-4" />}
        />
        <MetricCard
          title="Avg. Winner Lift"
          value={`${avgLift.toFixed(1)}%`}
          subtitle="Conversion rate improvement"
          icon={<ArrowRight className="w-4 h-4" />}
        />
      </div>

      {/* Draft Tests */}
      {draftTests.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            Drafts
            <span className="text-xs text-zinc-500 font-normal bg-zinc-800 px-2 py-0.5 rounded-full">
              {draftTests.length}
            </span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {draftTests.map((test) => (
              <div
                key={test.id}
                className="bg-seat-card border border-seat-border rounded-xl p-4 hover:border-zinc-600 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <span className="text-xs font-medium px-2 py-0.5 rounded bg-zinc-700 text-zinc-400 mr-2">
                      Draft
                    </span>
                    <span className="text-xs font-medium px-2 py-0.5 rounded bg-seat-red/10 text-seat-red">
                      {SEQUENCE_TYPES.find((t) => t.value === test.sequence_type)?.label || test.sequence_type}
                    </span>
                  </div>
                  <button onClick={() => handleDelete(test.id)} className="text-zinc-600 hover:text-red-400 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <h3 className="text-white font-medium mb-3">{test.name}</h3>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="text-xs text-zinc-500 bg-zinc-800/50 rounded p-2 line-clamp-2">
                    <span className="text-seat-red font-medium">A:</span> {test.variant_a_message.slice(0, 80)}...
                  </div>
                  <div className="text-xs text-zinc-500 bg-zinc-800/50 rounded p-2 line-clamp-2">
                    <span className="text-blue-400 font-medium">B:</span> {test.variant_b_message.slice(0, 80)}...
                  </div>
                </div>
                <Button size="sm" onClick={() => handleStartDraft(test.id)}>
                  <Play className="w-3.5 h-3.5 mr-1" /> Start Test
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Tests */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
          Active Tests
          <span className="text-xs text-zinc-500 font-normal bg-zinc-800 px-2 py-0.5 rounded-full">
            {activeTests.length}
          </span>
        </h2>
        {activeTests.length === 0 ? (
          <div className="bg-seat-card border border-seat-border rounded-xl p-10 text-center">
            <FlaskConical className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
            <p className="text-zinc-500 text-sm">No active tests. Create one to start optimizing your messages.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {activeTests.map((test) => (
              <ActiveTestCard
                key={test.id}
                test={test}
                onStop={handleStop}
                onDeclareWinner={handleDeclareWinner}
              />
            ))}
          </div>
        )}
      </div>

      {/* Completed Tests */}
      {completedTests.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            Completed Tests
            <span className="text-xs text-zinc-500 font-normal bg-zinc-800 px-2 py-0.5 rounded-full">
              {completedTests.length}
            </span>
          </h2>
          <div className="bg-seat-card border border-seat-border rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-seat-border">
                  <th className="text-left text-xs text-zinc-500 uppercase tracking-wider font-medium px-4 py-3">Test Name</th>
                  <th className="text-left text-xs text-zinc-500 uppercase tracking-wider font-medium px-4 py-3">Type</th>
                  <th className="text-left text-xs text-zinc-500 uppercase tracking-wider font-medium px-4 py-3">Winner</th>
                  <th className="text-left text-xs text-zinc-500 uppercase tracking-wider font-medium px-4 py-3">Lift</th>
                  <th className="text-left text-xs text-zinc-500 uppercase tracking-wider font-medium px-4 py-3">Confidence</th>
                  <th className="text-left text-xs text-zinc-500 uppercase tracking-wider font-medium px-4 py-3">Dates</th>
                  <th className="text-right text-xs text-zinc-500 uppercase tracking-wider font-medium px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {completedTests.map((test) => {
                  const typeLabel = SEQUENCE_TYPES.find((t) => t.value === test.sequence_type)?.label || test.sequence_type;
                  const convSig = test.significance.conversions;
                  const winnerConv = test.winner === 'a' ? test.conversion_rate_a : test.conversion_rate_b;
                  const loserConv = test.winner === 'a' ? test.conversion_rate_b : test.conversion_rate_a;
                  const lift = liftPct(loserConv, winnerConv);
                  const startDate = test.started_at ? new Date(test.started_at).toLocaleDateString() : '--';
                  const endDate = test.ended_at ? new Date(test.ended_at).toLocaleDateString() : '--';

                  return (
                    <tr key={test.id} className="border-b border-seat-border/50 hover:bg-zinc-800/30 transition-colors">
                      <td className="px-4 py-3 text-sm text-white font-medium">{test.name}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs px-2 py-0.5 rounded bg-seat-red/10 text-seat-red">{typeLabel}</span>
                      </td>
                      <td className="px-4 py-3">
                        {test.winner ? (
                          <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 flex items-center gap-1 w-fit">
                            <Trophy className="w-3 h-3" />
                            Variant {test.winner.toUpperCase()}
                          </span>
                        ) : (
                          <span className="text-xs text-zinc-500">No winner</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm font-mono text-zinc-300">{test.winner ? lift : '--'}</td>
                      <td className="px-4 py-3 text-sm text-zinc-400">{convSig.confidence}%</td>
                      <td className="px-4 py-3 text-xs text-zinc-500">{startDate} - {endDate}</td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => handleDelete(test.id)} className="text-zinc-600 hover:text-red-400 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <CreateTestModal
          onClose={() => setShowCreate(false)}
          onSave={handleCreateTest}
        />
      )}
    </div>
  );
}

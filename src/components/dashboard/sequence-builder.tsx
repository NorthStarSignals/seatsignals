'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { SequenceDefinition } from '@/lib/types';
import { cn } from '@/lib/utils';
import {
  MessageSquare,
  Clock,
  GitBranch,
  Zap,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  X,
  Mail,
  Layers,
  ChevronRight,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

type StepType = 'message' | 'wait' | 'condition' | 'action';

interface MessageConfig {
  channel: 'sms' | 'email' | 'both';
  subject: string;
  body: string;
}

interface WaitConfig {
  amount: number;
  unit: 'hours' | 'days' | 'weeks';
}

interface ConditionConfig {
  condition: 'opened' | 'clicked' | 'not_opened' | 'not_clicked';
  timeout_days: number;
}

interface ActionConfig {
  action: 'add_tag' | 'remove_tag' | 'update_segment';
  value: string;
}

type StepConfig = MessageConfig | WaitConfig | ConditionConfig | ActionConfig;

interface SequenceStep {
  id: string;
  type: StepType;
  config: StepConfig;
}

interface SequenceBuilderProps {
  sequence?: SequenceDefinition;
  onSave: (data: {
    id?: string;
    name: string;
    type: string;
    enabled: boolean;
    channel: 'sms' | 'email' | 'both';
    steps: SequenceStep[];
  }) => void;
  onClose: () => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STEP_META: Record<StepType, { label: string; icon: typeof MessageSquare; color: string; bgColor: string }> = {
  message: { label: 'Send Message', icon: MessageSquare, color: 'text-blue-400', bgColor: 'bg-blue-500/10 border-blue-500/20' },
  wait: { label: 'Wait / Delay', icon: Clock, color: 'text-amber-400', bgColor: 'bg-amber-500/10 border-amber-500/20' },
  condition: { label: 'Condition', icon: GitBranch, color: 'text-purple-400', bgColor: 'bg-purple-500/10 border-purple-500/20' },
  action: { label: 'Action', icon: Zap, color: 'text-emerald-400', bgColor: 'bg-emerald-500/10 border-emerald-500/20' },
};

const SEQUENCE_TYPES = [
  'retention',
  'catering',
  'review',
  'birthday',
  'dead_hours',
  'churn_reengagement',
] as const;

const VARIABLE_CHIPS = [
  { label: '{first_name}', value: '{first_name}' },
  { label: '{restaurant_name}', value: '{restaurant_name}' },
  { label: '{offer_code}', value: '{offer_code}' },
];

function genId() {
  return `step_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function defaultConfig(type: StepType): StepConfig {
  switch (type) {
    case 'message':
      return { channel: 'sms', subject: '', body: '' };
    case 'wait':
      return { amount: 1, unit: 'days' };
    case 'condition':
      return { condition: 'opened', timeout_days: 3 };
    case 'action':
      return { action: 'add_tag', value: '' };
  }
}

function stepSummary(step: SequenceStep): string {
  switch (step.type) {
    case 'message': {
      const c = step.config as MessageConfig;
      const ch = c.channel === 'both' ? 'SMS + Email' : c.channel.toUpperCase();
      return c.body ? `${ch}: ${c.body.slice(0, 60)}${c.body.length > 60 ? '...' : ''}` : `${ch}: (empty)`;
    }
    case 'wait': {
      const c = step.config as WaitConfig;
      return `Wait ${c.amount} ${c.unit}`;
    }
    case 'condition': {
      const c = step.config as ConditionConfig;
      return `If ${c.condition.replace(/_/g, ' ')} within ${c.timeout_days}d`;
    }
    case 'action': {
      const c = step.config as ActionConfig;
      return `${c.action.replace(/_/g, ' ')}: ${c.value || '(no value)'}`;
    }
  }
}

// ─── Step Editor Panels ──────────────────────────────────────────────────────

const inputCls =
  'w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#E11D48] focus:ring-1 focus:ring-[#E11D48] transition-colors';
const labelCls = 'block text-xs font-medium text-zinc-400 mb-1';
const selectCls = cn(inputCls, 'appearance-none cursor-pointer');

function MessageEditor({
  config,
  onChange,
}: {
  config: MessageConfig;
  onChange: (c: MessageConfig) => void;
}) {
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const insertVariable = (v: string) => {
    const el = bodyRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const newBody = config.body.slice(0, start) + v + config.body.slice(end);
    onChange({ ...config, body: newBody });
    setTimeout(() => {
      el.focus();
      el.selectionStart = el.selectionEnd = start + v.length;
    }, 0);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className={labelCls}>Channel</label>
        <div className="flex gap-2">
          {(['sms', 'email', 'both'] as const).map((ch) => (
            <button
              key={ch}
              type="button"
              onClick={() => onChange({ ...config, channel: ch })}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                config.channel === ch
                  ? 'bg-[#E11D48]/10 border-[#E11D48]/40 text-[#E11D48]'
                  : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600'
              )}
            >
              {ch === 'sms' && <MessageSquare size={12} />}
              {ch === 'email' && <Mail size={12} />}
              {ch === 'both' && <Layers size={12} />}
              {ch === 'both' ? 'SMS + Email' : ch.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {(config.channel === 'email' || config.channel === 'both') && (
        <div>
          <label className={labelCls}>Subject Line</label>
          <input
            className={inputCls}
            placeholder="e.g. A special offer just for you!"
            value={config.subject}
            onChange={(e) => onChange({ ...config, subject: e.target.value })}
          />
        </div>
      )}

      <div>
        <label className={labelCls}>Message Body</label>
        <textarea
          ref={bodyRef}
          className={cn(inputCls, 'resize-none')}
          rows={5}
          placeholder="Write your message here..."
          value={config.body}
          onChange={(e) => onChange({ ...config, body: e.target.value })}
        />
        <div className="flex flex-wrap gap-1.5 mt-2">
          {VARIABLE_CHIPS.map((v) => (
            <button
              key={v.value}
              type="button"
              onClick={() => insertVariable(v.value)}
              className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 transition-colors"
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className={labelCls}>Preview</label>
        <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-3 text-sm text-zinc-300 whitespace-pre-wrap min-h-[48px]">
          {config.body || <span className="text-zinc-600 italic">No message content yet</span>}
        </div>
      </div>
    </div>
  );
}

function WaitEditor({
  config,
  onChange,
}: {
  config: WaitConfig;
  onChange: (c: WaitConfig) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <div className="flex-1">
          <label className={labelCls}>Duration</label>
          <input
            type="number"
            min="1"
            max="999"
            className={inputCls}
            value={config.amount}
            onChange={(e) => onChange({ ...config, amount: Math.max(1, parseInt(e.target.value) || 1) })}
          />
        </div>
        <div className="flex-1">
          <label className={labelCls}>Unit</label>
          <select
            className={selectCls}
            value={config.unit}
            onChange={(e) => onChange({ ...config, unit: e.target.value as WaitConfig['unit'] })}
          >
            <option value="hours">Hours</option>
            <option value="days">Days</option>
            <option value="weeks">Weeks</option>
          </select>
        </div>
      </div>
    </div>
  );
}

function ConditionEditor({
  config,
  onChange,
}: {
  config: ConditionConfig;
  onChange: (c: ConditionConfig) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className={labelCls}>Condition</label>
        <select
          className={selectCls}
          value={config.condition}
          onChange={(e) => onChange({ ...config, condition: e.target.value as ConditionConfig['condition'] })}
        >
          <option value="opened">Opened</option>
          <option value="clicked">Clicked</option>
          <option value="not_opened">Not Opened</option>
          <option value="not_clicked">Not Clicked</option>
        </select>
      </div>
      <div>
        <label className={labelCls}>Timeout (days)</label>
        <input
          type="number"
          min="1"
          max="90"
          className={inputCls}
          value={config.timeout_days}
          onChange={(e) => onChange({ ...config, timeout_days: Math.max(1, parseInt(e.target.value) || 1) })}
        />
      </div>
    </div>
  );
}

function ActionEditor({
  config,
  onChange,
}: {
  config: ActionConfig;
  onChange: (c: ActionConfig) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className={labelCls}>Action Type</label>
        <select
          className={selectCls}
          value={config.action}
          onChange={(e) => onChange({ ...config, action: e.target.value as ActionConfig['action'] })}
        >
          <option value="add_tag">Add Tag</option>
          <option value="remove_tag">Remove Tag</option>
          <option value="update_segment">Update Segment</option>
        </select>
      </div>
      <div>
        <label className={labelCls}>Value</label>
        <input
          className={inputCls}
          placeholder={config.action === 'update_segment' ? 'e.g. VIP' : 'e.g. loyal-customer'}
          value={config.value}
          onChange={(e) => onChange({ ...config, value: e.target.value })}
        />
      </div>
    </div>
  );
}

// ─── Add Step Dropdown ───────────────────────────────────────────────────────

function AddStepButton({ onAdd }: { onAdd: (type: StepType) => void }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative flex items-center justify-center py-1">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 transition-colors z-10"
      >
        <Plus size={12} />
        Add Step
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 z-30 bg-zinc-900 border border-zinc-700 rounded-xl shadow-xl p-1.5 w-48">
            {(Object.keys(STEP_META) as StepType[]).map((type) => {
              const meta = STEP_META[type];
              const Icon = meta.icon;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    onAdd(type);
                    setOpen(false);
                  }}
                  className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-xs text-zinc-300 hover:bg-zinc-800 transition-colors"
                >
                  <Icon size={14} className={meta.color} />
                  {meta.label}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Step Card ───────────────────────────────────────────────────────────────

function StepCard({
  step,
  index,
  total,
  selected,
  onSelect,
  onMoveUp,
  onMoveDown,
  onDelete,
}: {
  step: SequenceStep;
  index: number;
  total: number;
  selected: boolean;
  onSelect: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const meta = STEP_META[step.type];
  const Icon = meta.icon;

  return (
    <div
      onClick={onSelect}
      className={cn(
        'group relative bg-zinc-900 border rounded-xl p-4 cursor-pointer transition-all',
        selected
          ? 'border-[#E11D48]/50 ring-1 ring-[#E11D48]/20'
          : 'border-zinc-800 hover:border-zinc-700'
      )}
    >
      <div className="flex items-start gap-3">
        {/* Step icon */}
        <div className={cn('flex items-center justify-center w-8 h-8 rounded-lg border shrink-0', meta.bgColor)}>
          <Icon size={16} className={meta.color} />
        </div>

        {/* Step info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[10px] font-semibold text-zinc-500">STEP {index + 1}</span>
            <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded border', meta.bgColor, meta.color)}>
              {meta.label}
            </span>
          </div>
          <p className="text-sm text-zinc-300 truncate">{stepSummary(step)}</p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onMoveUp(); }}
            disabled={index === 0}
            className="p-1 rounded text-zinc-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronUp size={14} />
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onMoveDown(); }}
            disabled={index === total - 1}
            className="p-1 rounded text-zinc-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronDown size={14} />
          </button>
          {confirmDelete ? (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="px-2 py-0.5 rounded text-[10px] font-semibold bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 transition-colors"
            >
              Confirm
            </button>
          ) : (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setConfirmDelete(true); setTimeout(() => setConfirmDelete(false), 2500); }}
              className="p-1 rounded text-zinc-500 hover:text-red-400 transition-colors"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Selected indicator */}
      {selected && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <ChevronRight size={14} className="text-[#E11D48]" />
        </div>
      )}
    </div>
  );
}

// ─── Main Builder ────────────────────────────────────────────────────────────

export function SequenceBuilder({ sequence, onSave, onClose }: SequenceBuilderProps) {
  const [name, setName] = useState(sequence?.name ?? '');
  const [type, setType] = useState(sequence?.type ?? 'retention');
  const [enabled, setEnabled] = useState(sequence?.enabled ?? true);
  const [channel, setChannel] = useState<'sms' | 'email' | 'both'>(sequence?.channel ?? 'sms');
  const [steps, setSteps] = useState<SequenceStep[]>(() => {
    // If editing an existing sequence with a message_template, seed one message step
    if (sequence?.message_template) {
      return [
        {
          id: genId(),
          type: 'message' as StepType,
          config: {
            channel: sequence.channel,
            subject: sequence.subject ?? '',
            body: sequence.message_template,
          } as MessageConfig,
        },
      ];
    }
    return [];
  });
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  // ── Step CRUD ─────────────────────────────────────────────────────────────

  const addStep = (stepType: StepType, afterIndex?: number) => {
    const newStep: SequenceStep = {
      id: genId(),
      type: stepType,
      config: defaultConfig(stepType),
    };
    setSteps((prev) => {
      const idx = afterIndex !== undefined ? afterIndex + 1 : prev.length;
      const next = [...prev];
      next.splice(idx, 0, newStep);
      return next;
    });
    setSelectedIdx(afterIndex !== undefined ? afterIndex + 1 : steps.length);
  };

  const updateStepConfig = (idx: number, config: StepConfig) => {
    setSteps((prev) => prev.map((s, i) => (i === idx ? { ...s, config } : s)));
  };

  const moveStep = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= steps.length) return;
    setSteps((prev) => {
      const next = [...prev];
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
    setSelectedIdx(target);
  };

  const deleteStep = (idx: number) => {
    setSteps((prev) => prev.filter((_, i) => i !== idx));
    setSelectedIdx(null);
  };

  // ── Save ──────────────────────────────────────────────────────────────────

  const handleSave = () => {
    onSave({
      id: sequence?.id,
      name,
      type,
      enabled,
      channel,
      steps,
    });
  };

  // ── Render ────────────────────────────────────────────────────────────────

  const selectedStep = selectedIdx !== null ? steps[selectedIdx] : null;

  return (
    <div className="fixed inset-0 z-50 bg-[#09090B] flex flex-col">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-sm">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors shrink-0"
          >
            <X size={18} />
          </button>

          <input
            className="bg-transparent text-white text-lg font-semibold placeholder-zinc-600 focus:outline-none flex-1 min-w-0"
            placeholder="Sequence name..."
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {/* Type selector */}
          <select
            className="bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-[#E11D48] appearance-none cursor-pointer"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            {SEQUENCE_TYPES.map((t) => (
              <option key={t} value={t}>
                {t.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
              </option>
            ))}
          </select>

          {/* Channel selector */}
          <div className="flex gap-1">
            {(['sms', 'email', 'both'] as const).map((ch) => (
              <button
                key={ch}
                type="button"
                onClick={() => setChannel(ch)}
                className={cn(
                  'px-2.5 py-1.5 rounded-lg text-[11px] font-medium border transition-colors',
                  channel === ch
                    ? 'bg-[#E11D48]/10 border-[#E11D48]/40 text-[#E11D48]'
                    : 'bg-zinc-800 border-zinc-700 text-zinc-500 hover:text-zinc-300'
                )}
              >
                {ch === 'both' ? 'Both' : ch.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Enabled toggle */}
          <div className="flex items-center gap-2 pl-2 border-l border-zinc-700">
            <span className="text-[11px] text-zinc-500">{enabled ? 'On' : 'Off'}</span>
            <button
              type="button"
              role="switch"
              aria-checked={enabled}
              onClick={() => setEnabled(!enabled)}
              className={cn(
                'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
                enabled ? 'bg-[#E11D48]' : 'bg-zinc-700'
              )}
            >
              <span
                className={cn(
                  'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform',
                  enabled ? 'translate-x-4' : 'translate-x-0'
                )}
              />
            </button>
          </div>
        </div>
      </div>

      {/* ── Body ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Timeline */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-xl mx-auto">
            {/* Start marker */}
            <div className="flex items-center gap-3 mb-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500 border-2 border-emerald-400 shrink-0" />
              <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wide">Sequence Start</span>
            </div>

            {steps.length === 0 && (
              <div className="ml-1.5 border-l-2 border-zinc-700 pl-8 py-6">
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Zap size={28} className="text-zinc-700 mb-3" />
                  <p className="text-sm text-zinc-500 mb-1">No steps yet</p>
                  <p className="text-xs text-zinc-600 mb-4">Add your first step to start building the sequence</p>
                </div>
              </div>
            )}

            {steps.map((step, idx) => (
              <div key={step.id}>
                {/* Connecting line + card */}
                <div className="ml-1.5 border-l-2 border-zinc-700 pl-8 py-1.5">
                  <StepCard
                    step={step}
                    index={idx}
                    total={steps.length}
                    selected={selectedIdx === idx}
                    onSelect={() => setSelectedIdx(selectedIdx === idx ? null : idx)}
                    onMoveUp={() => moveStep(idx, -1)}
                    onMoveDown={() => moveStep(idx, 1)}
                    onDelete={() => deleteStep(idx)}
                  />
                </div>

                {/* Add step button between steps */}
                <div className="ml-1.5 border-l-2 border-zinc-700 pl-8">
                  <AddStepButton onAdd={(t) => addStep(t, idx)} />
                </div>
              </div>
            ))}

            {/* Final add step */}
            {steps.length === 0 && (
              <div className="ml-1.5 border-l-2 border-zinc-700 pl-8">
                <AddStepButton onAdd={(t) => addStep(t)} />
              </div>
            )}

            {/* End marker */}
            <div className="flex items-center gap-3 mt-2">
              <div className="w-3 h-3 rounded-full bg-zinc-600 border-2 border-zinc-500 shrink-0" />
              <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wide">Sequence End</span>
            </div>
          </div>
        </div>

        {/* Right: Step Editor Panel */}
        {selectedStep && (
          <div className="w-96 border-l border-zinc-800 bg-zinc-900/50 overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                {(() => {
                  const meta = STEP_META[selectedStep.type];
                  const Icon = meta.icon;
                  return (
                    <>
                      <Icon size={16} className={meta.color} />
                      <h3 className="text-sm font-semibold text-white">{meta.label}</h3>
                    </>
                  );
                })()}
              </div>
              <button
                type="button"
                onClick={() => setSelectedIdx(null)}
                className="p-1 rounded text-zinc-500 hover:text-white transition-colors"
              >
                <X size={14} />
              </button>
            </div>

            {selectedStep.type === 'message' && (
              <MessageEditor
                config={selectedStep.config as MessageConfig}
                onChange={(c) => updateStepConfig(selectedIdx!, c)}
              />
            )}
            {selectedStep.type === 'wait' && (
              <WaitEditor
                config={selectedStep.config as WaitConfig}
                onChange={(c) => updateStepConfig(selectedIdx!, c)}
              />
            )}
            {selectedStep.type === 'condition' && (
              <ConditionEditor
                config={selectedStep.config as ConditionConfig}
                onChange={(c) => updateStepConfig(selectedIdx!, c)}
              />
            )}
            {selectedStep.type === 'action' && (
              <ActionEditor
                config={selectedStep.config as ActionConfig}
                onChange={(c) => updateStepConfig(selectedIdx!, c)}
              />
            )}
          </div>
        )}
      </div>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-6 py-3 border-t border-zinc-800 bg-zinc-900/80 backdrop-blur-sm">
        <p className="text-xs text-zinc-500">
          {steps.length} step{steps.length !== 1 ? 's' : ''}
        </p>
        <div className="flex items-center gap-3">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            disabled={!name.trim()}
            onClick={handleSave}
          >
            {sequence ? 'Save Changes' : 'Create Sequence'}
          </Button>
        </div>
      </div>
    </div>
  );
}

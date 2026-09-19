'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  Zap,
  Mail,
  MessageSquare,
  Clock,
  Gift,
  UserPlus,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Play,
  Pause,
} from 'lucide-react';

interface SequenceStep {
  id: string;
  type: 'email' | 'sms' | 'wait' | 'condition' | 'reward';
  config: {
    subject?: string;
    message?: string;
    delay_days?: number;
    condition?: string;
    reward?: string;
  };
}

interface Sequence {
  id: string;
  name: string;
  trigger: string;
  status: 'active' | 'draft' | 'paused';
  steps: SequenceStep[];
  enrolled: number;
  completed: number;
}

const STEP_TYPES = [
  { type: 'email', label: 'Send Email', icon: Mail, color: 'text-blue-400 bg-blue-500/10' },
  { type: 'sms', label: 'Send SMS', icon: MessageSquare, color: 'text-green-400 bg-green-500/10' },
  { type: 'wait', label: 'Wait / Delay', icon: Clock, color: 'text-amber-400 bg-amber-500/10' },
  { type: 'reward', label: 'Give Reward', icon: Gift, color: 'text-purple-400 bg-purple-500/10' },
];

const prebuiltSequences: Sequence[] = [
  {
    id: 'seq1', name: 'New Customer Welcome', trigger: 'First visit', status: 'active', enrolled: 245, completed: 180,
    steps: [
      { id: 's1', type: 'email', config: { subject: 'Welcome to {{restaurant_name}}!', message: 'Thank you for dining with us! We hope you loved your first visit.' } },
      { id: 's2', type: 'wait', config: { delay_days: 3 } },
      { id: 's3', type: 'sms', config: { message: 'Hey {{first_name}}! Enjoyed your visit? Leave us a review and get 10% off your next meal!' } },
      { id: 's4', type: 'wait', config: { delay_days: 7 } },
      { id: 's5', type: 'reward', config: { reward: '10% off next visit coupon' } },
      { id: 's6', type: 'email', config: { subject: 'Your exclusive welcome offer inside', message: 'Use code WELCOME10 for 10% off your next visit. Valid for 30 days.' } },
    ],
  },
  {
    id: 'seq2', name: 'Win-Back Campaign', trigger: 'No visit in 30 days', status: 'active', enrolled: 128, completed: 45,
    steps: [
      { id: 's1', type: 'email', config: { subject: 'We miss you, {{first_name}}!', message: 'It\'s been a while! We\'ve got exciting new dishes waiting for you.' } },
      { id: 's2', type: 'wait', config: { delay_days: 5 } },
      { id: 's3', type: 'sms', config: { message: 'We miss you! Come back this week and enjoy a free appetizer on us. 🍽️' } },
      { id: 's4', type: 'wait', config: { delay_days: 14 } },
      { id: 's5', type: 'reward', config: { reward: 'Free appetizer + 20% off entrée' } },
      { id: 's6', type: 'email', config: { subject: 'Last chance: Your VIP offer expires soon', message: 'Don\'t miss out on your exclusive offer. Valid until end of week.' } },
    ],
  },
  {
    id: 'seq3', name: 'Birthday Flow', trigger: '7 days before birthday', status: 'draft', enrolled: 0, completed: 0,
    steps: [
      { id: 's1', type: 'email', config: { subject: 'Happy Birthday, {{first_name}}! 🎂', message: 'Celebrate with us! Here\'s a special birthday treat waiting for you.' } },
      { id: 's2', type: 'reward', config: { reward: 'Free dessert + birthday cocktail' } },
      { id: 's3', type: 'wait', config: { delay_days: 3 } },
      { id: 's4', type: 'sms', config: { message: 'Your birthday treat is waiting! Reserve your table and we\'ll make it extra special. 🎉' } },
    ],
  },
];

export default function SequenceBuilderPage() {
  const [sequences, setSequences] = useState(prebuiltSequences);
  const [expandedId, setExpandedId] = useState<string | null>('seq1');

  const toggleStatus = (id: string) => {
    setSequences(sequences.map(s => {
      if (s.id !== id) return s;
      return { ...s, status: s.status === 'active' ? 'paused' : 'active' };
    }));
  };

  const addStep = (seqId: string, type: string) => {
    setSequences(sequences.map(s => {
      if (s.id !== seqId) return s;
      const newStep: SequenceStep = {
        id: `step-${Date.now()}`,
        type: type as SequenceStep['type'],
        config: type === 'wait' ? { delay_days: 3 } : type === 'reward' ? { reward: '' } : { subject: '', message: '' },
      };
      return { ...s, steps: [...s.steps, newStep] };
    }));
  };

  const removeStep = (seqId: string, stepId: string) => {
    setSequences(sequences.map(s => {
      if (s.id !== seqId) return s;
      return { ...s, steps: s.steps.filter(st => st.id !== stepId) };
    }));
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-seat-red/10 flex items-center justify-center">
            <Zap className="w-5 h-5 text-seat-red" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Sequence Builder</h1>
            <p className="text-sm text-zinc-500">Build automated marketing flows</p>
          </div>
        </div>
      </div>

      {/* Sequences */}
      <div className="space-y-4">
        {sequences.map(seq => {
          const expanded = expandedId === seq.id;
          return (
            <div key={seq.id} className="bg-seat-card border border-seat-border rounded-xl overflow-hidden">
              {/* Header */}
              <div className="p-4 flex items-center justify-between cursor-pointer" onClick={() => setExpandedId(expanded ? null : seq.id)}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-seat-red/10 flex items-center justify-center">
                    <Zap size={14} className="text-seat-red" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">{seq.name}</h3>
                    <div className="flex items-center gap-3 mt-0.5 text-[11px] text-zinc-500">
                      <span>Trigger: {seq.trigger}</span>
                      <span>{seq.steps.length} steps</span>
                      {seq.enrolled > 0 && <span>{seq.enrolled} enrolled</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={(e) => { e.stopPropagation(); toggleStatus(seq.id); }}
                    className={cn('flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium',
                      seq.status === 'active' ? 'bg-green-500/10 text-green-400' :
                      seq.status === 'paused' ? 'bg-amber-500/10 text-amber-400' :
                      'bg-zinc-800 text-zinc-500')}>
                    {seq.status === 'active' ? <Play size={10} /> : <Pause size={10} />}
                    {seq.status}
                  </button>
                  {expanded ? <ChevronUp size={16} className="text-zinc-500" /> : <ChevronDown size={16} className="text-zinc-500" />}
                </div>
              </div>

              {/* Steps */}
              {expanded && (
                <div className="border-t border-seat-border px-4 py-4 space-y-3">
                  {/* Trigger */}
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-seat-red/10 flex items-center justify-center flex-shrink-0">
                      <UserPlus size={14} className="text-seat-red" />
                    </div>
                    <div className="flex-1 bg-zinc-800/30 rounded-lg p-3">
                      <p className="text-[10px] text-zinc-500 uppercase">Trigger</p>
                      <p className="text-sm text-white">{seq.trigger}</p>
                    </div>
                  </div>

                  {/* Flow line */}
                  {seq.steps.map((step, idx) => {
                    const stepType = STEP_TYPES.find(t => t.type === step.type);
                    const Icon = stepType?.icon || Mail;
                    return (
                      <div key={step.id}>
                        {/* Connector */}
                        <div className="flex items-center justify-center py-1">
                          <div className="w-px h-4 bg-zinc-700" />
                        </div>
                        <div className="flex items-center gap-3">
                          <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', stepType?.color)}>
                            <Icon size={14} />
                          </div>
                          <div className="flex-1 bg-zinc-800/30 rounded-lg p-3">
                            <div className="flex items-center justify-between">
                              <p className="text-[10px] text-zinc-500 uppercase">Step {idx + 1} · {stepType?.label}</p>
                              <button onClick={() => removeStep(seq.id, step.id)} className="text-zinc-500 hover:text-red-400">
                                <Trash2 size={12} />
                              </button>
                            </div>
                            {step.type === 'wait' && (
                              <p className="text-sm text-white mt-1">Wait {step.config.delay_days} days</p>
                            )}
                            {step.type === 'reward' && (
                              <p className="text-sm text-white mt-1">🎁 {step.config.reward}</p>
                            )}
                            {(step.type === 'email' || step.type === 'sms') && (
                              <>
                                {step.config.subject && <p className="text-sm text-white font-medium mt-1">{step.config.subject}</p>}
                                <p className="text-xs text-zinc-400 mt-0.5">{step.config.message}</p>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Add Step */}
                  <div className="flex items-center justify-center py-1">
                    <div className="w-px h-4 bg-zinc-700" />
                  </div>
                  <div className="flex items-center gap-2 justify-center">
                    {STEP_TYPES.map(st => (
                      <button key={st.type} onClick={() => addStep(seq.id, st.type)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-zinc-800 text-zinc-400 rounded-lg text-xs hover:text-white border border-zinc-700 hover:border-seat-red transition-colors">
                        <Plus size={10} /> {st.label}
                      </button>
                    ))}
                  </div>

                  {/* Stats */}
                  {seq.enrolled > 0 && (
                    <div className="grid grid-cols-3 gap-4 mt-4 p-3 bg-zinc-800/20 rounded-lg">
                      <div className="text-center">
                        <p className="text-[10px] text-zinc-500">Enrolled</p>
                        <p className="text-sm font-bold text-white">{seq.enrolled}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] text-zinc-500">Completed</p>
                        <p className="text-sm font-bold text-green-400">{seq.completed}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] text-zinc-500">Completion Rate</p>
                        <p className="text-sm font-bold text-white">{Math.round((seq.completed / seq.enrolled) * 100)}%</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

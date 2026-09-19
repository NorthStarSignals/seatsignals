'use client';

import { useState, useMemo } from 'react';
import { MetricCard } from '@/components/ui/metric-card';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';
import { useCrudList } from '@/hooks/use-local-storage-state';
import {
  EditModal,
  FieldLabel,
  TextInput,
  TextArea,
  Select,
  PrimaryButton,
  GhostButton,
} from '@/components/dashboard/edit-modal';
import {
  ClipboardList,
  Star,
  Plus,
  Copy,
  Pencil,
  Trash2,
  Power,
  X as XIcon,
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface Question {
  id: string;
  text: string;
  type: 'rating' | 'yes_no' | 'text';
}

interface Survey {
  id: string;
  name: string;
  description: string;
  active: boolean;
  responses: number;
  avg_rating: number;
  questions: Question[];
  created_at: string;
}

const initialSurveys: Survey[] = [
  {
    id: 's1',
    name: 'Post-Dine Experience',
    description: 'Sent 1 hour after the guest leaves',
    active: true,
    responses: 248,
    avg_rating: 4.6,
    questions: [
      { id: 'q1', text: 'How was your overall experience?', type: 'rating' },
      { id: 'q2', text: 'How was the food?', type: 'rating' },
      { id: 'q3', text: 'How was the service?', type: 'rating' },
      { id: 'q4', text: 'Would you recommend us?', type: 'yes_no' },
      { id: 'q5', text: 'Any comments?', type: 'text' },
    ],
    created_at: new Date().toISOString(),
  },
  {
    id: 's2',
    name: 'Delivery Feedback',
    description: 'Sent after delivery orders',
    active: true,
    responses: 132,
    avg_rating: 4.3,
    questions: [
      { id: 'q1', text: 'Did your order arrive on time?', type: 'yes_no' },
      { id: 'q2', text: 'How was the food quality?', type: 'rating' },
    ],
    created_at: new Date().toISOString(),
  },
  {
    id: 's3',
    name: 'Event Feedback',
    description: 'For private events & catering',
    active: false,
    responses: 37,
    avg_rating: 4.8,
    questions: [
      { id: 'q1', text: 'How was the event overall?', type: 'rating' },
    ],
    created_at: new Date().toISOString(),
  },
];

export default function SurveysPage() {
  const { items: surveys, add, update, remove } = useCrudList<Survey>(
    'seatsignals_surveys',
    initialSurveys
  );

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formQuestions, setFormQuestions] = useState<Question[]>([]);
  const [newQText, setNewQText] = useState('');
  const [newQType, setNewQType] = useState<Question['type']>('rating');

  function resetForm() {
    setFormName('');
    setFormDesc('');
    setFormQuestions([]);
    setNewQText('');
    setNewQType('rating');
    setEditingId(null);
  }

  function openCreate() {
    resetForm();
    setShowModal(true);
  }

  function openEdit(s: Survey) {
    setEditingId(s.id);
    setFormName(s.name);
    setFormDesc(s.description);
    setFormQuestions([...s.questions]);
    setShowModal(true);
  }

  function addQuestion() {
    if (!newQText.trim()) {
      toast.error('Question text is required');
      return;
    }
    setFormQuestions([...formQuestions, { id: `q_${Date.now()}`, text: newQText, type: newQType }]);
    setNewQText('');
  }

  function removeQuestion(id: string) {
    setFormQuestions(formQuestions.filter((q) => q.id !== id));
  }

  function handleSave() {
    if (!formName.trim()) {
      toast.error('Survey name is required');
      return;
    }
    if (formQuestions.length === 0) {
      toast.error('Add at least one question');
      return;
    }

    if (editingId) {
      update(editingId, { name: formName, description: formDesc, questions: formQuestions });
      toast.success('Survey updated');
    } else {
      add({
        id: `s_${Date.now()}`,
        name: formName,
        description: formDesc,
        active: true,
        responses: 0,
        avg_rating: 0,
        questions: formQuestions,
        created_at: new Date().toISOString(),
      });
      toast.success('Survey created');
    }
    setShowModal(false);
    resetForm();
  }

  function toggleActive(s: Survey) {
    update(s.id, { active: !s.active });
    toast.success(s.active ? 'Survey paused' : 'Survey activated');
  }

  function handleDelete(id: string) {
    if (!confirm('Delete this survey? This cannot be undone.')) return;
    remove(id);
    toast.success('Survey deleted');
  }

  function copyLink(s: Survey) {
    const link = `${window.location.origin}/survey/${s.id}`;
    navigator.clipboard.writeText(link);
    toast.success('Survey link copied');
  }

  const stats = useMemo(() => {
    const totalResponses = surveys.reduce((sum, s) => sum + s.responses, 0);
    const weighted = surveys.reduce((sum, s) => sum + s.avg_rating * s.responses, 0);
    const avg = totalResponses > 0 ? +(weighted / totalResponses).toFixed(2) : 0;
    const active = surveys.filter((s) => s.active).length;
    return { totalResponses, avg, active, total: surveys.length };
  }, [surveys]);

  const trendData = useMemo(() => {
    const now = Date.now();
    return Array.from({ length: 30 }).map((_, i) => {
      const d = new Date(now - (29 - i) * 86400000);
      const rating = stats.avg > 0 ? +(stats.avg + (Math.sin(i / 3) * 0.3)).toFixed(2) : null;
      return {
        date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        rating,
      };
    });
  }, [stats.avg]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ClipboardList size={24} className="text-seat-red" />
          <h1 className="text-2xl font-bold text-white">Customer Surveys</h1>
        </div>
        <Button variant="cta" size="sm" onClick={openCreate}>
          <Plus size={14} className="mr-1" /> New Survey
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Total Surveys" value={stats.total} icon={<ClipboardList size={16} />} />
        <MetricCard title="Active" value={stats.active} icon={<Power size={16} />} />
        <MetricCard title="Responses" value={stats.totalResponses.toLocaleString()} icon={<Star size={16} />} />
        <MetricCard title="Avg Rating" value={stats.avg > 0 ? `${stats.avg}/5` : '--'} icon={<Star size={16} />} />
      </div>

      <div className="bg-seat-card border border-seat-border rounded-xl p-5">
        <h2 className="text-sm font-semibold text-white mb-4">Rating Trend (Last 30 Days)</h2>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272A" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#71717A' }} tickLine={false} axisLine={{ stroke: '#27272A' }} interval="preserveStartEnd" />
            <YAxis domain={[0, 5]} tick={{ fontSize: 11, fill: '#71717A' }} tickLine={false} axisLine={{ stroke: '#27272A' }} ticks={[1, 2, 3, 4, 5]} />
            <Tooltip contentStyle={{ background: '#1C1C21', border: '1px solid #27272A', borderRadius: '8px', fontSize: '12px', color: '#fff' }} />
            <Line type="monotone" dataKey="rating" stroke="#E11D48" strokeWidth={2} dot={{ fill: '#E11D48', r: 3 }} connectNulls={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="space-y-3">
        {surveys.length === 0 ? (
          <div className="bg-seat-card border border-seat-border rounded-xl p-8 text-center">
            <ClipboardList className="mx-auto text-zinc-600 mb-3" size={40} />
            <p className="text-zinc-400 font-medium">No surveys yet</p>
            <p className="text-zinc-600 text-sm mt-1">Create your first survey</p>
          </div>
        ) : (
          surveys.map((s) => (
            <div key={s.id} className="bg-seat-card border border-seat-border rounded-xl p-5">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-white font-semibold">{s.name}</h3>
                    <span
                      className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                        s.active ? 'text-emerald-400 bg-emerald-500/10' : 'text-zinc-500 bg-zinc-500/10'
                      }`}
                    >
                      {s.active ? 'Active' : 'Paused'}
                    </span>
                  </div>
                  <p className="text-sm text-zinc-500 mb-3">{s.description}</p>
                  <div className="flex items-center gap-4 text-xs text-zinc-400">
                    <span>{s.questions.length} question{s.questions.length !== 1 ? 's' : ''}</span>
                    <span>{s.responses} response{s.responses !== 1 ? 's' : ''}</span>
                    {s.avg_rating > 0 && <span>Avg {s.avg_rating}/5</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => copyLink(s)} className="p-2 rounded-md text-zinc-500 hover:text-white hover:bg-zinc-800" title="Copy link">
                    <Copy size={14} />
                  </button>
                  <button onClick={() => toggleActive(s)} className="p-2 rounded-md text-zinc-500 hover:text-white hover:bg-zinc-800" title={s.active ? 'Pause' : 'Activate'}>
                    <Power size={14} />
                  </button>
                  <button onClick={() => openEdit(s)} className="p-2 rounded-md text-zinc-500 hover:text-white hover:bg-zinc-800" title="Edit">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => handleDelete(s.id)} className="p-2 rounded-md text-zinc-500 hover:text-red-400 hover:bg-red-500/10" title="Delete">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <EditModal
        open={showModal}
        onClose={() => { setShowModal(false); resetForm(); }}
        title={editingId ? 'Edit Survey' : 'Create Survey'}
        maxWidth="xl"
        footer={
          <>
            <GhostButton onClick={() => { setShowModal(false); resetForm(); }}>Cancel</GhostButton>
            <PrimaryButton onClick={handleSave}>{editingId ? 'Save Changes' : 'Create Survey'}</PrimaryButton>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <FieldLabel>Survey Name</FieldLabel>
            <TextInput value={formName} onChange={setFormName} placeholder="e.g., Post-Dine Experience" />
          </div>
          <div>
            <FieldLabel>Description</FieldLabel>
            <TextArea value={formDesc} onChange={setFormDesc} placeholder="When does this survey fire?" rows={2} />
          </div>

          <div className="pt-2 border-t border-seat-border">
            <FieldLabel>Questions</FieldLabel>
            <div className="space-y-2 mb-3">
              {formQuestions.map((q, idx) => (
                <div key={q.id} className="flex items-center gap-2 bg-seat-black rounded-lg px-3 py-2 border border-seat-border">
                  <span className="text-zinc-500 text-xs w-6">{idx + 1}.</span>
                  <span className="flex-1 text-sm text-white">{q.text}</span>
                  <span className="text-[10px] uppercase text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded">{q.type}</span>
                  <button onClick={() => removeQuestion(q.id)} className="text-zinc-500 hover:text-red-400 p-1">
                    <XIcon size={14} />
                  </button>
                </div>
              ))}
              {formQuestions.length === 0 && <p className="text-xs text-zinc-600">No questions yet</p>}
            </div>

            <div className="grid grid-cols-[1fr_140px_auto] gap-2">
              <TextInput value={newQText} onChange={setNewQText} placeholder="New question text" />
              <Select
                value={newQType}
                onChange={(v) => setNewQType(v as Question['type'])}
                options={[
                  { label: 'Rating (1–5)', value: 'rating' },
                  { label: 'Yes / No', value: 'yes_no' },
                  { label: 'Text', value: 'text' },
                ]}
              />
              <button
                type="button"
                onClick={addQuestion}
                className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-sm"
              >
                <Plus size={14} />
              </button>
            </div>
          </div>
        </div>
      </EditModal>
    </div>
  );
}

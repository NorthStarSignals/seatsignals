'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import toast from 'react-hot-toast';
import { useCrudList } from '@/hooks/use-local-storage-state';
import {
  FileText,
  Copy,
  Edit,
  Plus,
  Sparkles,
  Search,
  Tag,
  X,
  Hash,
  Mail,
  MessageSquare,
  Trash2,
} from 'lucide-react';

// ── Types ───────────────────────────────────────────────────────────

interface Template {
  id: string;
  restaurant_id: string | null;
  name: string;
  category: string;
  channel: string;
  subject: string | null;
  body: string;
  variables: string[];
  is_system: boolean;
  usage_count: number;
  created_at: string;
}

// ── Constants ───────────────────────────────────────────────────────

const CATEGORIES = [
  'all',
  'retention',
  'birthday',
  'review_request',
  'welcome',
  'dead_hours',
  'catering',
  'win_back',
  'referral',
  'custom',
] as const;

const CATEGORY_LABELS: Record<string, string> = {
  all: 'All',
  retention: 'Retention',
  birthday: 'Birthday',
  review_request: 'Review Request',
  welcome: 'Welcome',
  dead_hours: 'Dead Hours',
  catering: 'Catering',
  win_back: 'Win-Back',
  referral: 'Referral',
  custom: 'Custom',
};

const CATEGORY_COLORS: Record<string, string> = {
  retention: 'bg-emerald-500/15 text-emerald-400',
  birthday: 'bg-pink-500/15 text-pink-400',
  review_request: 'bg-blue-500/15 text-blue-400',
  welcome: 'bg-teal-500/15 text-teal-400',
  dead_hours: 'bg-orange-500/15 text-orange-400',
  catering: 'bg-violet-500/15 text-violet-400',
  win_back: 'bg-red-500/15 text-red-400',
  referral: 'bg-amber-500/15 text-amber-400',
  custom: 'bg-zinc-500/15 text-zinc-400',
};

const AVAILABLE_VARIABLES = [
  'first_name',
  'restaurant_name',
  'offer_code',
  'visit_count',
  'birthday_date',
  'review_link',
] as const;

const SAMPLE_DATA: Record<string, string> = {
  first_name: 'Sarah',
  restaurant_name: 'Bella Cucina',
  offer_code: 'SAVE15',
  visit_count: '7',
  birthday_date: 'April 12',
  review_link: 'https://g.co/review/bella',
};

// ── Channel Badge ──────────────────────────────────────────────────

function ChannelBadge({ channel }: { channel: string }) {
  const styles: Record<string, string> = {
    sms: 'bg-blue-500/15 text-blue-400',
    email: 'bg-purple-500/15 text-purple-400',
    both: 'bg-amber-500/15 text-amber-400',
  };
  const icons: Record<string, React.ReactNode> = {
    sms: <MessageSquare className="w-3 h-3" />,
    email: <Mail className="w-3 h-3" />,
    both: <Hash className="w-3 h-3" />,
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${styles[channel] || styles.sms}`}>
      {icons[channel] || icons.sms}
      {channel.toUpperCase()}
    </span>
  );
}

// ── Category Badge ─────────────────────────────────────────────────

function CategoryBadge({ category }: { category: string }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${CATEGORY_COLORS[category] || CATEGORY_COLORS.custom}`}>
      <Tag className="w-3 h-3" />
      {CATEGORY_LABELS[category] || category}
    </span>
  );
}

// ── Render preview with sample data ────────────────────────────────

function renderPreview(text: string): string {
  let result = text;
  for (const [key, value] of Object.entries(SAMPLE_DATA)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
  }
  return result;
}

// ── Template Card ──────────────────────────────────────────────────

function TemplateCard({
  template,
  onEdit,
  onUse,
}: {
  template: Template;
  onEdit: (t: Template) => void;
  onUse: (t: Template) => void;
}) {
  const preview = template.body.length > 100
    ? template.body.slice(0, 100) + '...'
    : template.body;

  return (
    <div className="bg-seat-card border border-seat-border rounded-xl p-5 flex flex-col gap-3 hover:border-zinc-600 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold text-white truncate">{template.name}</h3>
        {template.is_system && (
          <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-700/50 text-zinc-400 uppercase tracking-wide">
            System
          </span>
        )}
      </div>

      {/* Badges */}
      <div className="flex items-center gap-2 flex-wrap">
        <CategoryBadge category={template.category} />
        <ChannelBadge channel={template.channel} />
      </div>

      {/* Preview */}
      <p className="text-xs text-zinc-400 leading-relaxed whitespace-pre-line">{preview}</p>

      {/* Variable pills */}
      {template.variables && template.variables.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {template.variables.map((v) => (
            <span key={v} className="inline-flex items-center px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 text-[10px] font-mono">
              {`{${v}}`}
            </span>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-auto pt-2 border-t border-seat-border">
        <span className="text-[10px] text-zinc-500">Used {template.usage_count || 0} times</span>
        <div className="flex items-center gap-2">
          {!template.is_system && (
            <button
              onClick={() => onEdit(template)}
              className="text-zinc-400 hover:text-white transition-colors"
              title="Edit"
            >
              <Edit className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={() => onUse(template)}
            className="inline-flex items-center gap-1 text-xs text-seat-red hover:text-seat-red-dark transition-colors font-medium"
          >
            <Copy className="w-3.5 h-3.5" />
            Use
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Create / Edit Modal ────────────────────────────────────────────

function TemplateModal({
  template,
  onClose,
  onSave,
}: {
  template: Template | null; // null = creating new
  onClose: () => void;
  onSave: (data: {
    id?: string;
    name: string;
    category: string;
    channel: string;
    subject: string | null;
    body: string;
    variables: string[];
  }) => void;
}) {
  const isEdit = !!template;

  const [name, setName] = useState(template?.name ?? '');
  const [category, setCategory] = useState(template?.category ?? 'custom');
  const [channel, setChannel] = useState(template?.channel ?? 'sms');
  const [subject, setSubject] = useState(template?.subject ?? '');
  const [body, setBody] = useState(template?.body ?? '');

  // Detect variables from body
  const detectedVars = useMemo(() => {
    const matches = body.match(/\{(\w+)\}/g);
    if (!matches) return [];
    return Array.from(new Set(matches.map((m) => m.replace(/[{}]/g, ''))));
  }, [body]);

  const charCount = body.length;
  const isSms = channel === 'sms';

  function insertVariable(v: string) {
    setBody((prev) => prev + `{${v}}`);
  }

  function handleSave() {
    if (!name.trim() || !body.trim()) {
      toast.error('Name and body are required');
      return;
    }
    onSave({
      id: isEdit && template ? template.id : undefined,
      name,
      category,
      channel,
      subject: (channel === 'email' || channel === 'both') && subject ? subject : null,
      body,
      variables: detectedVars,
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-seat-dark border border-seat-border rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-seat-border">
          <h2 className="text-lg font-semibold text-white">
            {isEdit ? 'Edit Template' : 'Create Template'}
          </h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Name */}
          <Input
            label="Template Name"
            placeholder="e.g. Weekly Special Reminder"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          {/* Category + Channel */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-zinc-400">Category</label>
              <select
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-seat-red/50"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {CATEGORIES.filter((c) => c !== 'all').map((c) => (
                  <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-zinc-400">Channel</label>
              <div className="flex rounded-lg overflow-hidden border border-zinc-800">
                {['sms', 'email', 'both'].map((ch) => (
                  <button
                    key={ch}
                    onClick={() => setChannel(ch)}
                    className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                      channel === ch
                        ? 'bg-seat-red text-white'
                        : 'bg-zinc-900 text-zinc-400 hover:text-white'
                    }`}
                  >
                    {ch.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Subject (email only) */}
          {(channel === 'email' || channel === 'both') && (
            <Input
              label="Subject Line"
              placeholder="e.g. A special offer just for you, {first_name}!"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          )}

          {/* Variable insertion buttons */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-zinc-400">Insert Variable</label>
            <div className="flex flex-wrap gap-1.5">
              {AVAILABLE_VARIABLES.map((v) => (
                <button
                  key={v}
                  onClick={() => insertVariable(v)}
                  className="px-2.5 py-1 rounded-full bg-zinc-800 text-zinc-300 text-xs font-mono hover:bg-zinc-700 hover:text-white transition-colors"
                >
                  {`{${v}}`}
                </button>
              ))}
            </div>
          </div>

          {/* Body textarea */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-zinc-400">Message Body</label>
              {isSms && (
                <span className={`text-xs font-mono ${charCount > 160 ? 'text-red-400' : 'text-zinc-500'}`}>
                  {charCount}/160
                </span>
              )}
            </div>
            <textarea
              rows={5}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-seat-red/50 focus:border-seat-red transition-colors resize-none"
              placeholder="Write your message template here..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </div>

          {/* AI Generate button */}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setBody(
                `Hi {first_name}, this is ${CATEGORY_LABELS[category] || category} content from {restaurant_name}. Use code {offer_code}.`
              );
              if (channel === 'email' || channel === 'both') {
                setSubject(`A ${CATEGORY_LABELS[category]} message for you, {first_name}!`);
              }
              toast.success('Template generated!');
            }}
          >
            <Sparkles className="w-3.5 h-3.5" />
            AI Generate
          </Button>

          {/* Preview */}
          {body.trim() && (
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-zinc-400">Preview</label>
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 space-y-2">
                {(channel === 'email' || channel === 'both') && subject && (
                  <p className="text-xs font-semibold text-zinc-300">
                    Subject: {renderPreview(subject)}
                  </p>
                )}
                <p className="text-sm text-zinc-300 whitespace-pre-line leading-relaxed">
                  {renderPreview(body)}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-seat-border">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleSave}>
            {isEdit ? 'Update Template' : 'Save Template'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────

const INITIAL_TEMPLATES: Template[] = [
  {
    id: 't1',
    restaurant_id: null,
    name: 'Welcome New Customer',
    category: 'welcome',
    channel: 'sms',
    subject: null,
    body: 'Welcome to {restaurant_name}, {first_name}! Thanks for joining us. Use code {offer_code} for 10% off your next visit.',
    variables: ['restaurant_name', 'first_name', 'offer_code'],
    is_system: true,
    usage_count: 128,
    created_at: new Date().toISOString(),
  },
  {
    id: 't2',
    restaurant_id: null,
    name: 'Birthday Free Dessert',
    category: 'birthday',
    channel: 'email',
    subject: 'Happy Birthday, {first_name}!',
    body: 'Happy Birthday, {first_name}! Come celebrate at {restaurant_name} - free dessert on us on your birthday.',
    variables: ['first_name', 'restaurant_name'],
    is_system: true,
    usage_count: 64,
    created_at: new Date().toISOString(),
  },
  {
    id: 't3',
    restaurant_id: null,
    name: '30-Day Win-Back',
    category: 'win_back',
    channel: 'both',
    subject: 'We miss you, {first_name}',
    body: "Hi {first_name}, it's been a while! Come back to {restaurant_name} and save 15% with code {offer_code}.",
    variables: ['first_name', 'restaurant_name', 'offer_code'],
    is_system: false,
    usage_count: 42,
    created_at: new Date().toISOString(),
  },
  {
    id: 't4',
    restaurant_id: null,
    name: 'Review Request After Visit',
    category: 'review_request',
    channel: 'sms',
    subject: null,
    body: 'Hi {first_name}, thanks for visiting {restaurant_name}! We\'d love your feedback: {review_link}',
    variables: ['first_name', 'restaurant_name', 'review_link'],
    is_system: true,
    usage_count: 201,
    created_at: new Date().toISOString(),
  },
];

export default function TemplatesPage() {
  const { items: templates, add, update, remove } = useCrudList<Template>(
    'seatsignals_templates',
    INITIAL_TEMPLATES
  );

  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);

  // Filter by tab + search
  const filtered = useMemo(() => {
    let result = templates;
    if (activeTab !== 'all') {
      result = result.filter((t) => t.category === activeTab);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.body.toLowerCase().includes(q) ||
          (t.subject && t.subject.toLowerCase().includes(q))
      );
    }
    return result;
  }, [templates, activeTab, search]);

  function handleUse(template: Template) {
    const text = template.subject
      ? `Subject: ${template.subject}\n\n${template.body}`
      : template.body;
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
    update(template.id, { usage_count: (template.usage_count || 0) + 1 });
  }

  function handleEdit(template: Template) {
    setEditingTemplate(template);
    setModalOpen(true);
  }

  function handleDelete(template: Template) {
    if (template.is_system) {
      toast.error('Cannot delete system templates');
      return;
    }
    if (!confirm('Delete this template?')) return;
    remove(template.id);
    toast.success('Template deleted');
  }

  function handleSave(data: {
    id?: string;
    name: string;
    category: string;
    channel: string;
    subject: string | null;
    body: string;
    variables: string[];
  }) {
    if (data.id) {
      update(data.id, {
        name: data.name,
        category: data.category,
        channel: data.channel,
        subject: data.subject,
        body: data.body,
        variables: data.variables,
      });
      toast.success('Template updated!');
    } else {
      add({
        id: `t_${Date.now()}`,
        restaurant_id: null,
        name: data.name,
        category: data.category,
        channel: data.channel,
        subject: data.subject,
        body: data.body,
        variables: data.variables,
        is_system: false,
        usage_count: 0,
        created_at: new Date().toISOString(),
      });
      toast.success('Template created!');
    }
  }

  return (
    <div className="space-y-6">
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <FileText className="w-6 h-6 text-seat-red" />
            Message Templates
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Pre-built and custom message templates for your sequences
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => {
            setEditingTemplate(null);
            setModalOpen(true);
          }}
        >
          <Plus className="w-4 h-4" />
          Create Template
        </Button>
      </div>

      {/* ── Search Bar ──────────────────────────────────────────── */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
        <input
          type="text"
          placeholder="Search templates by name or content..."
          className="w-full bg-seat-card border border-seat-border rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-seat-red/50 focus:border-seat-red transition-colors"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* ── Category Tabs ───────────────────────────────────────── */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-hide">
        {CATEGORIES.map((cat) => {
          const count = cat === 'all'
            ? templates.length
            : templates.filter((t) => t.category === cat).length;
          return (
            <button
              key={cat}
              onClick={() => setActiveTab(cat)}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeTab === cat
                  ? 'bg-seat-red text-white'
                  : 'bg-zinc-800/50 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
              }`}
            >
              {CATEGORY_LABELS[cat]} ({count})
            </button>
          );
        })}
      </div>

      {/* ── Template Grid ───────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <FileText className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
          <p className="text-zinc-400 text-sm">No templates found</p>
          <p className="text-zinc-500 text-xs mt-1">
            {search ? 'Try a different search term' : 'Create your first template to get started'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((t) => (
            <div key={t.id} className="relative group">
              <TemplateCard
                template={t}
                onEdit={handleEdit}
                onUse={handleUse}
              />
              {/* Delete button for custom templates */}
              {!t.is_system && (
                <button
                  onClick={() => handleDelete(t)}
                  className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity text-zinc-500 hover:text-red-400"
                  title="Delete"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Modal ───────────────────────────────────────────────── */}
      {modalOpen && (
        <TemplateModal
          template={editingTemplate}
          onClose={() => {
            setModalOpen(false);
            setEditingTemplate(null);
          }}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

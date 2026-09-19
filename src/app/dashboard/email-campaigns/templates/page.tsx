'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import { useLocalStorageState } from '@/hooks/use-local-storage-state';
import {
  Mail,
  Bold,
  Italic,
  Underline,
  Link,
  Palette,
  Image,
  Eye,
  Save,
  Send,
  Copy,
  Trash2,
  Pencil,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  Gift,
  Cake,
  UserPlus,
  CalendarDays,
  Award,
  Newspaper,
  ChevronLeft,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  MousePointerClick,
  ArrowLeft,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface TemplatePreset {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  previewColor: string;
  defaultSubject: string;
  defaultBody: string;
}

interface SavedTemplate {
  id: string;
  name: string;
  subject: string;
  fromName: string;
  body: string;
  accentColor: string;
  logoUrl: string;
  lastEdited: string;
  stats: {
    sent: number;
    openRate: number;
    clickRate: number;
  };
}

interface EditorState {
  templateId: string | null;
  templateName: string;
  subject: string;
  fromName: string;
  body: string;
  accentColor: string;
  logoUrl: string;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const TEMPLATE_PRESETS: TemplatePreset[] = [
  {
    id: 'welcome',
    name: 'Welcome Email',
    description: 'Greet new customers after their first visit',
    icon: <UserPlus className="h-6 w-6" />,
    previewColor: '#3B82F6',
    defaultSubject: 'Welcome to {{restaurant_name}}, {{first_name}}!',
    defaultBody: `Hi {{first_name}},

Thank you for visiting {{restaurant_name}}! We're thrilled to have you as part of our family.

As a welcome gift, enjoy {{offer_details}} on your next visit. Simply show this email to your server.

We look forward to seeing you again soon!

Warm regards,
The {{restaurant_name}} Team`,
  },
  {
    id: 'birthday',
    name: 'Birthday Offer',
    description: 'Celebrate guests with a special birthday deal',
    icon: <Cake className="h-6 w-6" />,
    previewColor: '#EC4899',
    defaultSubject: 'Happy Birthday, {{first_name}}! A gift from {{restaurant_name}}',
    defaultBody: `Happy Birthday, {{first_name}}!

Everyone at {{restaurant_name}} wishes you the happiest of birthdays!

To celebrate YOUR special day, we have a little something for you: {{offer_details}}.

Valid for the entire month of your birthday. We can't wait to celebrate with you!

Cheers,
The {{restaurant_name}} Team`,
  },
  {
    id: 'winback',
    name: 'Win-Back',
    description: 'Re-engage guests who haven\'t visited recently',
    icon: <ChevronLeft className="h-6 w-6" />,
    previewColor: '#F59E0B',
    defaultSubject: 'We miss you, {{first_name}}! Come back to {{restaurant_name}}',
    defaultBody: `Hi {{first_name}},

It's been a while since we've seen you at {{restaurant_name}}, and we miss you!

We've been working on some exciting new menu items and we'd love for you to be one of the first to try them.

Here's a little incentive to come back: {{offer_details}}.

Hope to see you soon!

The {{restaurant_name}} Team`,
  },
  {
    id: 'event',
    name: 'Event Invite',
    description: 'Invite guests to upcoming restaurant events',
    icon: <CalendarDays className="h-6 w-6" />,
    previewColor: '#8B5CF6',
    defaultSubject: 'You\'re Invited! Special Event at {{restaurant_name}}',
    defaultBody: `Hi {{first_name}},

You're invited to an exclusive event at {{restaurant_name}}!

{{offer_details}}

Space is limited, so be sure to reserve your spot. Reply to this email or call us to RSVP.

We hope to see you there!

The {{restaurant_name}} Team`,
  },
  {
    id: 'loyalty',
    name: 'Loyalty Reward',
    description: 'Reward your most loyal customers',
    icon: <Award className="h-6 w-6" />,
    previewColor: '#10B981',
    defaultSubject: 'You\'ve earned a reward, {{first_name}}!',
    defaultBody: `Hi {{first_name}},

Great news! Your loyalty to {{restaurant_name}} has earned you a special reward.

{{offer_details}}

Thank you for being one of our most valued guests. We truly appreciate your continued support.

See you soon,
The {{restaurant_name}} Team`,
  },
  {
    id: 'newsletter',
    name: 'Monthly Newsletter',
    description: 'Share updates, specials, and news',
    icon: <Newspaper className="h-6 w-6" />,
    previewColor: '#06B6D4',
    defaultSubject: '{{restaurant_name}} Monthly Update - What\'s New!',
    defaultBody: `Hi {{first_name}},

Here's what's happening at {{restaurant_name}} this month!

NEW ON THE MENU
We've added some exciting new dishes that we think you'll love. Come in and try them!

UPCOMING EVENTS
{{offer_details}}

CHEF'S CORNER
Our chef has been experimenting with seasonal ingredients. Ask about our daily specials on your next visit!

Thank you for being part of our community.

The {{restaurant_name}} Team`,
  },
];

const MOCK_SAVED_TEMPLATES: SavedTemplate[] = [
  {
    id: 'saved-1',
    name: 'Spring Welcome Series',
    subject: 'Welcome to The Garden Bistro, {{first_name}}!',
    fromName: 'The Garden Bistro',
    body: 'Welcome email content...',
    accentColor: '#3B82F6',
    logoUrl: '',
    lastEdited: '2026-04-08',
    stats: { sent: 1245, openRate: 68.2, clickRate: 24.1 },
  },
  {
    id: 'saved-2',
    name: 'April Birthday Blast',
    subject: 'Happy Birthday from The Garden Bistro!',
    fromName: 'The Garden Bistro',
    body: 'Birthday offer content...',
    accentColor: '#EC4899',
    logoUrl: '',
    lastEdited: '2026-04-05',
    stats: { sent: 312, openRate: 72.8, clickRate: 31.5 },
  },
  {
    id: 'saved-3',
    name: 'Q1 Win-Back Campaign',
    subject: 'We miss you! Here\'s 20% off',
    fromName: 'The Garden Bistro',
    body: 'Win-back content...',
    accentColor: '#F59E0B',
    logoUrl: '',
    lastEdited: '2026-03-28',
    stats: { sent: 876, openRate: 45.3, clickRate: 18.7 },
  },
  {
    id: 'saved-4',
    name: 'Wine Dinner Invite',
    subject: 'You\'re Invited: Spring Wine Dinner',
    fromName: 'Events at The Garden Bistro',
    body: 'Event invite content...',
    accentColor: '#8B5CF6',
    logoUrl: '',
    lastEdited: '2026-03-22',
    stats: { sent: 534, openRate: 58.9, clickRate: 27.3 },
  },
  {
    id: 'saved-5',
    name: 'VIP Loyalty Reward',
    subject: 'You\'ve earned a free appetizer!',
    fromName: 'The Garden Bistro Rewards',
    body: 'Loyalty reward content...',
    accentColor: '#10B981',
    logoUrl: '',
    lastEdited: '2026-03-15',
    stats: { sent: 198, openRate: 81.4, clickRate: 42.1 },
  },
  {
    id: 'saved-6',
    name: 'March Newsletter',
    subject: 'The Garden Bistro - March Highlights',
    fromName: 'The Garden Bistro',
    body: 'Newsletter content...',
    accentColor: '#06B6D4',
    logoUrl: '',
    lastEdited: '2026-03-01',
    stats: { sent: 2103, openRate: 39.6, clickRate: 12.8 },
  },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatNumber(n: number): string {
  return n.toLocaleString('en-US');
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function TemplatePresetCard({
  preset,
  onSelect,
}: {
  preset: TemplatePreset;
  onSelect: (preset: TemplatePreset) => void;
}) {
  return (
    <div className="group rounded-xl border border-seat-border bg-seat-card p-4 transition-all hover:border-seat-red/50 hover:shadow-lg hover:shadow-seat-red/5">
      {/* Preview thumbnail */}
      <div
        className="mb-4 flex h-32 items-center justify-center rounded-lg"
        style={{ backgroundColor: `${preset.previewColor}15` }}
      >
        <div className="flex flex-col items-center gap-2">
          <div
            className="rounded-lg p-2"
            style={{ backgroundColor: `${preset.previewColor}25` }}
          >
            <div style={{ color: preset.previewColor }}>{preset.icon}</div>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div
              className="h-2 w-20 rounded-full"
              style={{ backgroundColor: `${preset.previewColor}30` }}
            />
            <div
              className="h-2 w-16 rounded-full"
              style={{ backgroundColor: `${preset.previewColor}20` }}
            />
            <div
              className="h-2 w-24 rounded-full"
              style={{ backgroundColor: `${preset.previewColor}15` }}
            />
          </div>
        </div>
      </div>

      <h3 className="text-sm font-semibold text-white">{preset.name}</h3>
      <p className="mb-3 mt-1 text-xs text-zinc-400">{preset.description}</p>

      <Button
        onClick={() => onSelect(preset)}
        className="w-full border border-seat-border bg-seat-black text-xs text-white hover:border-seat-red hover:bg-seat-red/10"
      >
        Use Template
      </Button>
    </div>
  );
}

function ToolbarButton({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      onClick={onClick}
      className={cn(
        'rounded-md p-2 transition-colors',
        active
          ? 'bg-seat-red/20 text-seat-red'
          : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
      )}
    >
      {icon}
    </button>
  );
}

function EmailPreview({
  editor,
}: {
  editor: EditorState;
}) {
  const accentColor = editor.accentColor || '#E11D48';

  const renderedBody = editor.body
    .replace(/\{\{first_name\}\}/g, 'Sarah')
    .replace(/\{\{restaurant_name\}\}/g, editor.fromName || 'Your Restaurant')
    .replace(/\{\{offer_details\}\}/g, '20% off your next visit');

  return (
    <div className="overflow-hidden rounded-xl border border-seat-border bg-white">
      {/* Email header bar */}
      <div className="flex items-center gap-2 border-b border-gray-200 bg-gray-50 px-4 py-2">
        <div className="flex gap-1.5">
          <div className="h-3 w-3 rounded-full bg-red-400" />
          <div className="h-3 w-3 rounded-full bg-yellow-400" />
          <div className="h-3 w-3 rounded-full bg-green-400" />
        </div>
        <span className="ml-2 text-xs text-gray-500">Email Preview</span>
      </div>

      {/* Email meta */}
      <div className="border-b border-gray-200 px-6 py-3">
        <p className="text-xs text-gray-500">
          From: <span className="font-medium text-gray-700">{editor.fromName || 'Your Restaurant'}</span>
        </p>
        <p className="mt-1 text-xs text-gray-500">
          Subject:{' '}
          <span className="font-medium text-gray-700">
            {(editor.subject || 'Your subject line here')
              .replace(/\{\{first_name\}\}/g, 'Sarah')
              .replace(/\{\{restaurant_name\}\}/g, editor.fromName || 'Your Restaurant')}
          </span>
        </p>
      </div>

      {/* Email body */}
      <div className="px-6 py-6">
        {/* Logo area */}
        {editor.logoUrl ? (
          <div className="mb-4 flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={editor.logoUrl}
              alt="Restaurant logo"
              className="h-12 object-contain"
            />
          </div>
        ) : (
          <div
            className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg"
            style={{ backgroundColor: accentColor }}
          >
            <Mail className="h-6 w-6 text-white" />
          </div>
        )}

        {/* Accent bar */}
        <div
          className="mb-4 h-1 w-16 rounded-full"
          style={{ backgroundColor: accentColor }}
        />

        {/* Body text */}
        <div className="whitespace-pre-line text-sm leading-relaxed text-gray-700">
          {renderedBody}
        </div>

        {/* Footer */}
        <div className="mt-8 border-t border-gray-100 pt-4">
          <p className="text-center text-xs text-gray-400">
            Sent with SeatSignals | Unsubscribe
          </p>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */

export default function EmailTemplatesPage() {
  const [editor, setEditor] = useState<EditorState>({
    templateId: null,
    templateName: '',
    subject: '',
    fromName: '',
    body: '',
    accentColor: '#E11D48',
    logoUrl: '',
  });

  const [showEditor, setShowEditor] = useState(false);
  const [savedTemplates, setSavedTemplates] = useLocalStorageState<SavedTemplate[]>(
    'seatsignals_email_templates',
    MOCK_SAVED_TEMPLATES
  );
  const [activeToolbar, setActiveToolbar] = useState<Record<string, boolean>>({
    bold: false,
    italic: false,
    underline: false,
    link: false,
  });

  /* -- Handlers ---------------------------------------------------- */

  function handleSelectPreset(preset: TemplatePreset) {
    setEditor({
      templateId: null,
      templateName: preset.name,
      subject: preset.defaultSubject,
      fromName: '',
      body: preset.defaultBody,
      accentColor: preset.previewColor,
      logoUrl: '',
    });
    setShowEditor(true);
  }

  function handleEditSaved(template: SavedTemplate) {
    setEditor({
      templateId: template.id,
      templateName: template.name,
      subject: template.subject,
      fromName: template.fromName,
      body: template.body,
      accentColor: template.accentColor,
      logoUrl: template.logoUrl,
    });
    setShowEditor(true);
  }

  function handleSaveTemplate() {
    if (!editor.templateName.trim()) {
      toast.error('Please enter a template name');
      return;
    }

    if (editor.templateId) {
      setSavedTemplates((prev) =>
        prev.map((t) =>
          t.id === editor.templateId
            ? {
                ...t,
                name: editor.templateName,
                subject: editor.subject,
                fromName: editor.fromName,
                body: editor.body,
                accentColor: editor.accentColor,
                logoUrl: editor.logoUrl,
                lastEdited: new Date().toISOString().split('T')[0],
              }
            : t
        )
      );
      toast.success('Template updated');
    } else {
      const newTemplate: SavedTemplate = {
        id: `saved-${Date.now()}`,
        name: editor.templateName,
        subject: editor.subject,
        fromName: editor.fromName,
        body: editor.body,
        accentColor: editor.accentColor,
        logoUrl: editor.logoUrl,
        lastEdited: new Date().toISOString().split('T')[0],
        stats: { sent: 0, openRate: 0, clickRate: 0 },
      };
      setSavedTemplates((prev) => [newTemplate, ...prev]);
      setEditor((prev) => ({ ...prev, templateId: newTemplate.id }));
      toast.success('Template saved');
    }
  }

  function handleSendTest() {
    toast.success('Test email sent to your inbox');
  }

  function handleDuplicate(template: SavedTemplate) {
    const duplicate: SavedTemplate = {
      ...template,
      id: `saved-${Date.now()}`,
      name: `${template.name} (Copy)`,
      lastEdited: new Date().toISOString().split('T')[0],
      stats: { sent: 0, openRate: 0, clickRate: 0 },
    };
    setSavedTemplates((prev) => [duplicate, ...prev]);
    toast.success('Template duplicated');
  }

  function handleDelete(id: string) {
    setSavedTemplates((prev) => prev.filter((t) => t.id !== id));
    toast.success('Template deleted');
  }

  function toggleToolbar(key: string) {
    setActiveToolbar((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  /* -- Render ------------------------------------------------------ */

  return (
    <div className="space-y-8 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          {showEditor && (
            <button
              type="button"
              onClick={() => setShowEditor(false)}
              className="mb-2 flex items-center gap-1 text-xs text-zinc-400 transition-colors hover:text-white"
            >
              <ArrowLeft className="h-3 w-3" />
              Back to templates
            </button>
          )}
          <h1 className="text-2xl font-bold text-white">
            {showEditor ? 'Edit Template' : 'Email Templates'}
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            {showEditor
              ? 'Customize your email template with merge tags and branding'
              : 'Choose a template to get started or manage your saved templates'}
          </p>
        </div>
      </div>

      {!showEditor ? (
        <>
          {/* ============================================================ */}
          {/*  Template Gallery                                            */}
          {/* ============================================================ */}
          <section>
            <h2 className="mb-4 text-lg font-semibold text-white">
              Pre-built Templates
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {TEMPLATE_PRESETS.map((preset) => (
                <TemplatePresetCard
                  key={preset.id}
                  preset={preset}
                  onSelect={handleSelectPreset}
                />
              ))}
            </div>
          </section>

          {/* ============================================================ */}
          {/*  Saved Templates                                             */}
          {/* ============================================================ */}
          <section>
            <h2 className="mb-4 text-lg font-semibold text-white">
              Saved Templates
            </h2>

            {savedTemplates.length === 0 ? (
              <div className="rounded-xl border border-seat-border bg-seat-card p-8 text-center">
                <Mail className="mx-auto mb-3 h-10 w-10 text-zinc-600" />
                <p className="text-sm text-zinc-400">
                  No saved templates yet. Pick a pre-built template above to get started.
                </p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-seat-border">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-seat-border bg-seat-card">
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-400">
                        Template
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-400">
                        Subject
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-400">
                        Sent
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-400">
                        Open Rate
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-400">
                        Click Rate
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-400">
                        Last Edited
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-400">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-seat-border bg-seat-black">
                    {savedTemplates.map((template) => (
                      <tr
                        key={template.id}
                        className="transition-colors hover:bg-seat-card/50"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div
                              className="h-8 w-8 flex-shrink-0 rounded-lg"
                              style={{
                                backgroundColor: `${template.accentColor}20`,
                              }}
                            >
                              <div
                                className="flex h-full w-full items-center justify-center"
                                style={{ color: template.accentColor }}
                              >
                                <Mail className="h-4 w-4" />
                              </div>
                            </div>
                            <span className="text-sm font-medium text-white">
                              {template.name}
                            </span>
                          </div>
                        </td>
                        <td className="max-w-[200px] truncate px-4 py-3 text-sm text-zinc-400">
                          {template.subject}
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-zinc-300">
                          {formatNumber(template.stats.sent)}
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-zinc-300">
                          {template.stats.openRate}%
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-zinc-300">
                          {template.stats.clickRate}%
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-zinc-400">
                          {formatDate(template.lastEdited)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              title="Edit"
                              onClick={() => handleEditSaved(template)}
                              className="rounded-md p-1.5 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              title="Duplicate"
                              onClick={() => handleDuplicate(template)}
                              className="rounded-md p-1.5 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
                            >
                              <Copy className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              title="Delete"
                              onClick={() => handleDelete(template.id)}
                              className="rounded-md p-1.5 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-red-400"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      ) : (
        /* ============================================================== */
        /*  Editor + Preview                                               */
        /* ============================================================== */
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          {/* Left: Editor */}
          <div className="space-y-5">
            {/* Template name */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-400">
                Template Name
              </label>
              <Input
                value={editor.templateName}
                onChange={(e) =>
                  setEditor((prev) => ({
                    ...prev,
                    templateName: e.target.value,
                  }))
                }
                placeholder="e.g., Spring Welcome Series"
                className="border-seat-border bg-seat-black text-white placeholder:text-zinc-600"
              />
            </div>

            {/* Subject + From row */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-400">
                  Subject Line
                </label>
                <Input
                  value={editor.subject}
                  onChange={(e) =>
                    setEditor((prev) => ({ ...prev, subject: e.target.value }))
                  }
                  placeholder="e.g., Welcome, {{first_name}}!"
                  className="border-seat-border bg-seat-black text-white placeholder:text-zinc-600"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-400">
                  From Name
                </label>
                <Input
                  value={editor.fromName}
                  onChange={(e) =>
                    setEditor((prev) => ({
                      ...prev,
                      fromName: e.target.value,
                    }))
                  }
                  placeholder="e.g., The Garden Bistro"
                  className="border-seat-border bg-seat-black text-white placeholder:text-zinc-600"
                />
              </div>
            </div>

            {/* Toolbar */}
            <div className="flex items-center gap-1 rounded-lg border border-seat-border bg-seat-card p-1.5">
              <ToolbarButton
                icon={<Bold className="h-4 w-4" />}
                label="Bold"
                active={activeToolbar.bold}
                onClick={() => toggleToolbar('bold')}
              />
              <ToolbarButton
                icon={<Italic className="h-4 w-4" />}
                label="Italic"
                active={activeToolbar.italic}
                onClick={() => toggleToolbar('italic')}
              />
              <ToolbarButton
                icon={<Underline className="h-4 w-4" />}
                label="Underline"
                active={activeToolbar.underline}
                onClick={() => toggleToolbar('underline')}
              />
              <ToolbarButton
                icon={<Link className="h-4 w-4" />}
                label="Insert Link"
                active={activeToolbar.link}
                onClick={() => toggleToolbar('link')}
              />

              <div className="mx-2 h-5 w-px bg-seat-border" />

              {/* Merge tag shortcuts */}
              <span className="text-xs text-zinc-500">Insert:</span>
              {['{{first_name}}', '{{restaurant_name}}', '{{offer_details}}'].map(
                (tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() =>
                      setEditor((prev) => ({
                        ...prev,
                        body: prev.body + tag,
                      }))
                    }
                    className="rounded-md bg-seat-red/10 px-2 py-1 text-xs text-seat-red transition-colors hover:bg-seat-red/20"
                  >
                    {tag.replace(/\{\{|\}\}/g, '')}
                  </button>
                )
              )}
            </div>

            {/* Body textarea */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-400">
                Email Body
              </label>
              <textarea
                value={editor.body}
                onChange={(e) =>
                  setEditor((prev) => ({ ...prev, body: e.target.value }))
                }
                rows={14}
                placeholder="Write your email content here. Use merge tags like {{first_name}} for personalization."
                className="w-full resize-y rounded-lg border border-seat-border bg-seat-black px-3 py-2 text-sm leading-relaxed text-white placeholder:text-zinc-600 focus:border-seat-red focus:outline-none focus:ring-1 focus:ring-seat-red"
              />
            </div>

            {/* Accent color + Logo URL */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-400">
                  <Palette className="mr-1 inline h-3.5 w-3.5" />
                  Accent Color
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={editor.accentColor}
                    onChange={(e) =>
                      setEditor((prev) => ({
                        ...prev,
                        accentColor: e.target.value,
                      }))
                    }
                    className="h-9 w-9 cursor-pointer rounded-md border border-seat-border bg-transparent"
                  />
                  <Input
                    value={editor.accentColor}
                    onChange={(e) =>
                      setEditor((prev) => ({
                        ...prev,
                        accentColor: e.target.value,
                      }))
                    }
                    className="border-seat-border bg-seat-black font-mono text-sm text-white"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-400">
                  <Image className="mr-1 inline h-3.5 w-3.5" />
                  Logo URL
                </label>
                <Input
                  value={editor.logoUrl}
                  onChange={(e) =>
                    setEditor((prev) => ({ ...prev, logoUrl: e.target.value }))
                  }
                  placeholder="https://example.com/logo.png"
                  className="border-seat-border bg-seat-black text-white placeholder:text-zinc-600"
                />
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-3 pt-2">
              <Button
                onClick={handleSaveTemplate}
                className="bg-seat-red text-white hover:bg-seat-red/90"
              >
                <Save className="mr-2 h-4 w-4" />
                Save Template
              </Button>
              <Button
                onClick={handleSendTest}
                className="border border-seat-border bg-seat-card text-white hover:bg-zinc-800"
              >
                <Send className="mr-2 h-4 w-4" />
                Send Test
              </Button>
            </div>
          </div>

          {/* Right: Preview */}
          <div>
            <div className="mb-3 flex items-center gap-2">
              <Eye className="h-4 w-4 text-zinc-400" />
              <span className="text-sm font-medium text-zinc-400">
                Live Preview
              </span>
            </div>
            <div className="sticky top-6">
              <EmailPreview editor={editor} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

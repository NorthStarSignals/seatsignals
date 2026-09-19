'use client';

import { useState } from 'react';
import { MetricCard } from '@/components/ui/metric-card';
import { cn } from '@/lib/utils';
import { useLocalStorageState, useCrudList } from '@/hooks/use-local-storage-state';
import {
  EditModal,
  FieldLabel,
  TextInput,
  Select,
  PrimaryButton,
  GhostButton,
} from '@/components/dashboard/edit-modal';
import toast from 'react-hot-toast';
import { Clock, Calendar, Sun, Moon, Pencil, Trash2 } from 'lucide-react';

interface DayHours {
  day: string;
  open: boolean;
  lunch: { open: string; close: string };
  dinner: { open: string; close: string };
  bar: { open: string; close: string };
}

interface SpecialHours {
  id: string;
  date: string;
  name: string;
  hours: string;
  status: 'modified' | 'extended' | 'closed';
}

const DEFAULT_REGULAR_HOURS: DayHours[] = [
  { day: 'Monday', open: true, lunch: { open: '11:00 AM', close: '2:30 PM' }, dinner: { open: '5:00 PM', close: '10:00 PM' }, bar: { open: '4:00 PM', close: '11:00 PM' } },
  { day: 'Tuesday', open: true, lunch: { open: '11:00 AM', close: '2:30 PM' }, dinner: { open: '5:00 PM', close: '10:00 PM' }, bar: { open: '4:00 PM', close: '11:00 PM' } },
  { day: 'Wednesday', open: true, lunch: { open: '11:00 AM', close: '2:30 PM' }, dinner: { open: '5:00 PM', close: '10:00 PM' }, bar: { open: '4:00 PM', close: '11:00 PM' } },
  { day: 'Thursday', open: true, lunch: { open: '11:00 AM', close: '2:30 PM' }, dinner: { open: '5:00 PM', close: '10:30 PM' }, bar: { open: '4:00 PM', close: '11:30 PM' } },
  { day: 'Friday', open: true, lunch: { open: '11:00 AM', close: '3:00 PM' }, dinner: { open: '5:00 PM', close: '11:00 PM' }, bar: { open: '4:00 PM', close: '12:00 AM' } },
  { day: 'Saturday', open: true, lunch: { open: '10:00 AM', close: '3:00 PM' }, dinner: { open: '5:00 PM', close: '11:00 PM' }, bar: { open: '12:00 PM', close: '12:00 AM' } },
  { day: 'Sunday', open: true, lunch: { open: '10:00 AM', close: '3:00 PM' }, dinner: { open: '5:00 PM', close: '9:00 PM' }, bar: { open: '12:00 PM', close: '10:00 PM' } },
];

const DEFAULT_SPECIAL: SpecialHours[] = [
  { id: 'sh-1', date: 'Apr 20, 2026', name: 'Easter Sunday', hours: '10:00 AM - 4:00 PM (Brunch Only)', status: 'modified' },
  { id: 'sh-2', date: 'May 10, 2026', name: "Mother's Day", hours: '10:00 AM - 10:00 PM', status: 'extended' },
  { id: 'sh-3', date: 'May 25, 2026', name: 'Memorial Day', hours: 'Closed', status: 'closed' },
  { id: 'sh-4', date: 'Jul 4, 2026', name: 'Independence Day', hours: '11:00 AM - 6:00 PM', status: 'modified' },
];

const STATUS_COLORS: Record<string, string> = {
  modified: 'bg-amber-500/10 text-amber-400',
  extended: 'bg-green-500/10 text-green-400',
  closed: 'bg-red-500/10 text-red-400',
};

export default function HoursPage() {
  const [regularHours, setRegularHours] = useLocalStorageState<DayHours[]>(
    'seatsignals_settings_hours_regular',
    DEFAULT_REGULAR_HOURS
  );
  const { items: specialHours, add, update, remove } = useCrudList<SpecialHours>(
    'seatsignals_settings_hours_special',
    DEFAULT_SPECIAL
  );

  const [editingDay, setEditingDay] = useState<DayHours | null>(null);
  const [editingSpecial, setEditingSpecial] = useState<SpecialHours | null>(null);
  const [showAddSpecial, setShowAddSpecial] = useState(false);

  const [specialForm, setSpecialForm] = useState<Omit<SpecialHours, 'id'>>({
    date: '', name: '', hours: '', status: 'modified',
  });

  const openDays = regularHours.filter(d => d.open).length;

  const saveDay = (patch: DayHours) => {
    setRegularHours(prev => prev.map(d => (d.day === patch.day ? patch : d)));
    toast.success(`${patch.day} hours saved`);
    setEditingDay(null);
  };

  const saveSpecial = () => {
    if (!specialForm.date || !specialForm.name) {
      toast.error('Date and name are required');
      return;
    }
    if (editingSpecial) {
      update(editingSpecial.id, specialForm);
      toast.success('Special hours updated');
    } else {
      add({ id: `sh-${Date.now()}`, ...specialForm });
      toast.success('Special hours added');
    }
    setEditingSpecial(null);
    setShowAddSpecial(false);
    setSpecialForm({ date: '', name: '', hours: '', status: 'modified' });
  };

  const openEditSpecial = (s: SpecialHours) => {
    setEditingSpecial(s);
    setSpecialForm({ date: s.date, name: s.name, hours: s.hours, status: s.status });
  };

  const openAddSpecial = () => {
    setShowAddSpecial(true);
    setSpecialForm({ date: '', name: '', hours: '', status: 'modified' });
  };

  const deleteSpecial = (id: string) => {
    if (!confirm('Delete this special hours entry?')) return;
    remove(id);
    toast.success('Deleted');
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-seat-red/10 flex items-center justify-center">
            <Clock className="w-5 h-5 text-seat-red" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Operating Hours</h1>
            <p className="text-sm text-zinc-500">Set regular and special hours for your restaurant</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard title="Days Open" value={`${openDays}/7`} icon={<Calendar size={18} />} />
        <MetricCard title="Lunch Service" value="11AM-3PM" icon={<Sun size={18} />} />
        <MetricCard title="Dinner Service" value="5PM-11PM" icon={<Moon size={18} />} />
        <MetricCard title="Special Hours" value={specialHours.length} icon={<Clock size={18} />} />
      </div>

      {/* Regular Hours */}
      <div className="bg-seat-card border border-seat-border rounded-xl p-5">
        <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-3">Regular Hours</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] text-zinc-500 uppercase border-b border-seat-border">
              <th className="text-left py-2 px-3">Day</th>
              <th className="text-center py-2 px-3">Status</th>
              <th className="text-center py-2 px-3">Lunch</th>
              <th className="text-center py-2 px-3">Dinner</th>
              <th className="text-center py-2 px-3">Bar</th>
              <th className="text-center py-2 px-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {regularHours.map(d => (
              <tr key={d.day} className="border-b border-seat-border/30">
                <td className="py-3 px-3 text-white font-medium">{d.day}</td>
                <td className="py-3 px-3 text-center">
                  <button
                    onClick={() =>
                      setRegularHours(prev =>
                        prev.map(r => (r.day === d.day ? { ...r, open: !r.open } : r))
                      )
                    }
                    className={cn('w-8 h-5 rounded-full flex items-center mx-auto px-0.5',
                      d.open ? 'bg-green-500/20 justify-end' : 'bg-zinc-700 justify-start')}
                  >
                    <div className={cn('w-4 h-4 rounded-full', d.open ? 'bg-green-400' : 'bg-zinc-500')} />
                  </button>
                </td>
                <td className="py-3 px-3 text-center text-zinc-300">
                  {d.open ? `${d.lunch.open} - ${d.lunch.close}` : '—'}
                </td>
                <td className="py-3 px-3 text-center text-zinc-300">
                  {d.open ? `${d.dinner.open} - ${d.dinner.close}` : '—'}
                </td>
                <td className="py-3 px-3 text-center text-zinc-300">
                  {d.open ? `${d.bar.open} - ${d.bar.close}` : '—'}
                </td>
                <td className="py-3 px-3 text-center">
                  <button
                    onClick={() => setEditingDay(d)}
                    className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-white transition"
                  >
                    <Pencil size={12} /> Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Special Hours */}
      <div className="bg-seat-card border border-seat-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">Special Hours & Holidays</h3>
          <button
            onClick={openAddSpecial}
            className="text-xs px-3 py-1.5 bg-seat-red text-white rounded-lg font-medium hover:bg-seat-red/90"
          >
            + Add Special Hours
          </button>
        </div>
        <div className="space-y-2">
          {specialHours.length === 0 && (
            <p className="text-xs text-zinc-500 py-6 text-center">No special hours configured.</p>
          )}
          {specialHours.map(h => (
            <div key={h.id} className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-zinc-800/30">
              <div className="flex items-center gap-3">
                <div className="text-center w-16">
                  <p className="text-xs font-bold text-white">{h.date.split(',')[0]}</p>
                </div>
                <div>
                  <p className="text-sm text-white font-medium">{h.name}</p>
                  <p className="text-[10px] text-zinc-500">{h.hours}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-medium capitalize', STATUS_COLORS[h.status])}>
                  {h.status}
                </span>
                <button
                  onClick={() => openEditSpecial(h)}
                  className="p-1.5 text-zinc-400 hover:text-white transition"
                  aria-label="Edit"
                >
                  <Pencil size={12} />
                </button>
                <button
                  onClick={() => deleteSpecial(h.id)}
                  className="p-1.5 text-zinc-400 hover:text-red-400 transition"
                  aria-label="Delete"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Edit Day Modal */}
      {editingDay && (
        <DayHoursModal
          day={editingDay}
          onCancel={() => setEditingDay(null)}
          onSave={saveDay}
        />
      )}

      {/* Add / Edit Special Hours Modal */}
      <EditModal
        open={showAddSpecial || editingSpecial !== null}
        onClose={() => { setShowAddSpecial(false); setEditingSpecial(null); }}
        title={editingSpecial ? 'Edit Special Hours' : 'Add Special Hours'}
        footer={
          <>
            <GhostButton onClick={() => { setShowAddSpecial(false); setEditingSpecial(null); }}>
              Cancel
            </GhostButton>
            <PrimaryButton onClick={saveSpecial}>
              {editingSpecial ? 'Save Changes' : 'Add'}
            </PrimaryButton>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <FieldLabel>Date</FieldLabel>
            <TextInput
              value={specialForm.date}
              onChange={v => setSpecialForm(p => ({ ...p, date: v }))}
              placeholder="e.g. Jul 4, 2026"
            />
          </div>
          <div>
            <FieldLabel>Occasion Name</FieldLabel>
            <TextInput
              value={specialForm.name}
              onChange={v => setSpecialForm(p => ({ ...p, name: v }))}
              placeholder="e.g. Independence Day"
            />
          </div>
          <div>
            <FieldLabel>Hours Description</FieldLabel>
            <TextInput
              value={specialForm.hours}
              onChange={v => setSpecialForm(p => ({ ...p, hours: v }))}
              placeholder="e.g. 11:00 AM - 6:00 PM or Closed"
            />
          </div>
          <div>
            <FieldLabel>Status</FieldLabel>
            <Select
              value={specialForm.status}
              onChange={v => setSpecialForm(p => ({ ...p, status: v as SpecialHours['status'] }))}
              options={[
                { label: 'Modified', value: 'modified' },
                { label: 'Extended', value: 'extended' },
                { label: 'Closed', value: 'closed' },
              ]}
            />
          </div>
        </div>
      </EditModal>
    </div>
  );
}

function DayHoursModal({
  day,
  onCancel,
  onSave,
}: {
  day: DayHours;
  onCancel: () => void;
  onSave: (d: DayHours) => void;
}) {
  const [form, setForm] = useState<DayHours>(day);

  return (
    <EditModal
      open={true}
      onClose={onCancel}
      title={`Edit ${day.day} Hours`}
      footer={
        <>
          <GhostButton onClick={onCancel}>Cancel</GhostButton>
          <PrimaryButton onClick={() => onSave(form)}>Save</PrimaryButton>
        </>
      }
    >
      <div className="space-y-4">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={form.open}
            onChange={e => setForm(f => ({ ...f, open: e.target.checked }))}
            className="w-4 h-4 rounded border-zinc-600 bg-seat-black"
          />
          <span className="text-sm text-white">Open this day</span>
        </label>

        {['lunch', 'dinner', 'bar'].map(section => (
          <div key={section}>
            <FieldLabel>{section.charAt(0).toUpperCase() + section.slice(1)}</FieldLabel>
            <div className="flex gap-2">
              <TextInput
                value={form[section as 'lunch' | 'dinner' | 'bar'].open}
                onChange={v =>
                  setForm(f => ({
                    ...f,
                    [section]: { ...f[section as 'lunch' | 'dinner' | 'bar'], open: v },
                  }))
                }
                placeholder="Open"
              />
              <TextInput
                value={form[section as 'lunch' | 'dinner' | 'bar'].close}
                onChange={v =>
                  setForm(f => ({
                    ...f,
                    [section]: { ...f[section as 'lunch' | 'dinner' | 'bar'], close: v },
                  }))
                }
                placeholder="Close"
              />
            </div>
          </div>
        ))}
      </div>
    </EditModal>
  );
}

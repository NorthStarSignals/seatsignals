'use client';

import { useState } from 'react';
import { useCrudList } from '@/hooks/use-local-storage-state';
import {
  EditModal,
  FieldLabel,
  TextInput,
  TextArea,
  Select,
  PrimaryButton,
  GhostButton,
  DangerButton,
} from '@/components/dashboard/edit-modal';
import toast from 'react-hot-toast';
import { MetricCard } from '@/components/ui/metric-card';
import { cn } from '@/lib/utils';
import {
  Wrench,
  AlertTriangle,
  Clock,
  CheckCircle2,
  MapPin,
  User,
  Calendar,
  Filter,
  Plus,
  Pencil,
  Trash2,
} from 'lucide-react';

type Status = 'Open' | 'In Progress' | 'Scheduled' | 'Completed';
type Priority = 'Critical' | 'High' | 'Medium' | 'Low';

interface MaintenanceItem {
  id: string;
  title: string;
  location: string;
  reportedBy: string;
  dateReported: string;
  assignedTo: string;
  status: Status;
  priority: Priority;
  notes?: string;
}

const INITIAL: MaintenanceItem[] = [
  { id: 'MR-001', title: 'Walk-in cooler not cooling', location: 'Kitchen - Back', reportedBy: 'Chef Marcus', dateReported: '2026-04-07', assignedTo: 'Refrigeration Pros LLC', status: 'Open', priority: 'Critical' },
  { id: 'MR-002', title: 'Dishwasher leak', location: 'Kitchen - Dish Pit', reportedBy: 'Maria S.', dateReported: '2026-04-06', assignedTo: 'Jim (In-House)', status: 'In Progress', priority: 'High' },
  { id: 'MR-003', title: 'Hood vent fan noise', location: 'Kitchen - Line', reportedBy: 'Chef Marcus', dateReported: '2026-04-05', assignedTo: 'HVAC Solutions', status: 'Scheduled', priority: 'Medium' },
  { id: 'MR-004', title: 'Broken bar stool', location: 'Bar Area', reportedBy: 'Tanya R.', dateReported: '2026-04-04', assignedTo: 'Jim (In-House)', status: 'Completed', priority: 'Low' },
  { id: 'MR-005', title: 'POS terminal #3 frozen', location: 'Front of House', reportedBy: 'David K.', dateReported: '2026-04-08', assignedTo: 'Toast Support', status: 'Open', priority: 'High' },
  { id: 'MR-006', title: 'Bathroom faucet drip', location: "Restroom - Men's", reportedBy: 'Cleaning Staff', dateReported: '2026-04-03', assignedTo: 'City Plumbing Co.', status: 'Scheduled', priority: 'Low' },
  { id: 'MR-007', title: 'AC unit filter change', location: 'Dining Room', reportedBy: 'Manager on Duty', dateReported: '2026-04-01', assignedTo: 'HVAC Solutions', status: 'Completed', priority: 'Medium' },
  { id: 'MR-008', title: 'Grease trap cleaning', location: 'Kitchen - Back', reportedBy: 'Health Inspector Note', dateReported: '2026-04-09', assignedTo: 'GreenWaste Services', status: 'Open', priority: 'Critical' },
];

const statusConfig: Record<Status, { color: string; bg: string; border: string }> = {
  Open: { color: 'text-red-400', bg: 'bg-red-500/15', border: 'border-red-500/20' },
  'In Progress': { color: 'text-amber-400', bg: 'bg-amber-500/15', border: 'border-amber-500/20' },
  Scheduled: { color: 'text-blue-400', bg: 'bg-blue-500/15', border: 'border-blue-500/20' },
  Completed: { color: 'text-emerald-400', bg: 'bg-emerald-500/15', border: 'border-emerald-500/20' },
};

const priorityConfig: Record<Priority, { color: string; bg: string; border: string }> = {
  Critical: { color: 'text-red-400', bg: 'bg-red-500/15', border: 'border-red-500/20' },
  High: { color: 'text-orange-400', bg: 'bg-orange-500/15', border: 'border-orange-500/20' },
  Medium: { color: 'text-yellow-400', bg: 'bg-yellow-500/15', border: 'border-yellow-500/20' },
  Low: { color: 'text-zinc-400', bg: 'bg-zinc-500/15', border: 'border-zinc-500/20' },
};

function StatusBadge({ status }: { status: Status }) {
  const config = statusConfig[status];
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border', config.bg, config.color, config.border)}>
      {status}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: Priority }) {
  const config = priorityConfig[priority];
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border', config.bg, config.color, config.border)}>
      {priority === 'Critical' && <AlertTriangle className="w-3 h-3" />}
      {priority}
    </span>
  );
}

const STATUSES: Array<Status | 'All'> = ['All', 'Open', 'In Progress', 'Scheduled', 'Completed'];

export default function MaintenancePage() {
  const { items, add, update, remove } = useCrudList<MaintenanceItem>('seatsignals_maintenance', INITIAL);
  const [filterStatus, setFilterStatus] = useState<Status | 'All'>('All');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<MaintenanceItem | null>(null);
  const [form, setForm] = useState<Omit<MaintenanceItem, 'id'>>({
    title: '',
    location: '',
    reportedBy: '',
    dateReported: new Date().toISOString().slice(0, 10),
    assignedTo: '',
    status: 'Open',
    priority: 'Medium',
    notes: '',
  });

  const openAdd = () => {
    setEditing(null);
    setForm({
      title: '',
      location: '',
      reportedBy: '',
      dateReported: new Date().toISOString().slice(0, 10),
      assignedTo: '',
      status: 'Open',
      priority: 'Medium',
      notes: '',
    });
    setModalOpen(true);
  };

  const openEdit = (row: MaintenanceItem) => {
    setEditing(row);
    setForm({
      title: row.title,
      location: row.location,
      reportedBy: row.reportedBy,
      dateReported: row.dateReported,
      assignedTo: row.assignedTo,
      status: row.status,
      priority: row.priority,
      notes: row.notes || '',
    });
    setModalOpen(true);
  };

  const handleSave = () => {
    if (!form.title.trim()) {
      toast.error('Title required');
      return;
    }
    if (editing) {
      update(editing.id, form);
      toast.success('Request updated');
    } else {
      const newId = `MR-${String(Date.now()).slice(-6)}`;
      add({ id: newId, ...form });
      toast.success('Request created');
    }
    setModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (!confirm('Delete?')) return;
    remove(id);
    toast.success('Deleted');
  };

  const handleClose = (row: MaintenanceItem) => {
    update(row.id, { status: 'Completed' });
    toast.success(`${row.id} closed`);
  };

  const filteredItems = filterStatus === 'All' ? items : items.filter(item => item.status === filterStatus);
  const openCount = items.filter(i => i.status === 'Open').length;
  const criticalCount = items.filter(i => i.priority === 'Critical').length;
  const completedThisMonth = items.filter(i => i.status === 'Completed').length;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-lg bg-seat-red/10 flex items-center justify-center">
              <Wrench className="w-5 h-5 text-seat-red" />
            </div>
            <h1 className="text-2xl font-bold text-white">Maintenance</h1>
          </div>
          <p className="text-sm text-zinc-500 mt-1 ml-12">Track equipment and facility maintenance requests</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 bg-seat-red text-white text-sm font-medium rounded-lg hover:bg-seat-red/90"
        >
          <Plus className="w-4 h-4" /> New Request
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Open Requests" value={openCount} subtitle="Awaiting action" icon={<Wrench className="w-4 h-4" />} />
        <MetricCard title="Critical Items" value={criticalCount} subtitle="Needs immediate attention" icon={<AlertTriangle className="w-4 h-4" />} />
        <MetricCard title="Total Requests" value={items.length} subtitle="All time" icon={<Clock className="w-4 h-4" />} />
        <MetricCard title="Completed" value={completedThisMonth} subtitle="This month" icon={<CheckCircle2 className="w-4 h-4" />} />
      </div>

      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-zinc-500" />
        <div className="flex items-center gap-1 flex-wrap">
          {STATUSES.map(status => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
                filterStatus === status
                  ? 'bg-seat-red text-white'
                  : 'bg-seat-card border border-seat-border text-zinc-400 hover:text-white hover:border-zinc-500'
              )}
            >
              {status}
              {status !== 'All' && (
                <span className="ml-1.5 text-[10px] opacity-70">
                  {items.filter(i => i.status === status).length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-seat-card border border-seat-border rounded-xl overflow-hidden">
        {filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <CheckCircle2 className="w-12 h-12 text-zinc-700 mb-3" />
            <p className="text-sm text-zinc-500 font-medium">No maintenance requests found</p>
            <p className="text-xs text-zinc-600 mt-1">No items match the selected filter</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-seat-border">
                  <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 py-3">Request</th>
                  <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 py-3">Location</th>
                  <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 py-3">Reported By</th>
                  <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 py-3">Date</th>
                  <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 py-3">Assigned To</th>
                  <th className="text-center text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 py-3">Status</th>
                  <th className="text-center text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 py-3">Priority</th>
                  <th className="text-right text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map(item => (
                  <tr key={item.id} className="border-b border-seat-border/50 hover:bg-zinc-800/30 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-white">{item.title}</p>
                      <p className="text-xs text-zinc-600">{item.id}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3 h-3 text-zinc-600 flex-shrink-0" />
                        <span className="text-sm text-zinc-400">{item.location}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3 h-3 text-zinc-600 flex-shrink-0" />
                        <span className="text-sm text-zinc-400">{item.reportedBy}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3 h-3 text-zinc-600 flex-shrink-0" />
                        <span className="text-sm text-zinc-400">
                          {new Date(item.dateReported).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-zinc-400">{item.assignedTo}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <PriorityBadge priority={item.priority} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {item.status !== 'Completed' && (
                          <button
                            onClick={() => handleClose(item)}
                            className="text-[10px] px-2 py-1 bg-emerald-500/10 text-emerald-400 rounded hover:bg-emerald-500/20"
                          >
                            Close
                          </button>
                        )}
                        <button
                          onClick={() => openEdit(item)}
                          className="p-1.5 rounded-md text-zinc-500 hover:text-white hover:bg-zinc-800"
                          title="Edit"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-1.5 rounded-md text-zinc-500 hover:text-red-400 hover:bg-red-500/10"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <EditModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Maintenance Request' : 'New Maintenance Request'}
        maxWidth="lg"
        footer={
          <>
            {editing && (
              <DangerButton
                onClick={() => {
                  if (!confirm('Delete?')) return;
                  remove(editing.id);
                  toast.success('Deleted');
                  setModalOpen(false);
                }}
              >
                Delete
              </DangerButton>
            )}
            <GhostButton onClick={() => setModalOpen(false)}>Cancel</GhostButton>
            <PrimaryButton onClick={handleSave}>{editing ? 'Save' : 'Create'}</PrimaryButton>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <FieldLabel>Title</FieldLabel>
            <TextInput value={form.title} onChange={(v) => setForm({ ...form, title: v })} placeholder="e.g. Walk-in cooler not cooling" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel>Location</FieldLabel>
              <TextInput value={form.location} onChange={(v) => setForm({ ...form, location: v })} placeholder="e.g. Kitchen - Back" />
            </div>
            <div>
              <FieldLabel>Date Reported</FieldLabel>
              <TextInput type="date" value={form.dateReported} onChange={(v) => setForm({ ...form, dateReported: v })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel>Reported By</FieldLabel>
              <TextInput value={form.reportedBy} onChange={(v) => setForm({ ...form, reportedBy: v })} placeholder="e.g. Chef Marcus" />
            </div>
            <div>
              <FieldLabel>Assigned To</FieldLabel>
              <TextInput value={form.assignedTo} onChange={(v) => setForm({ ...form, assignedTo: v })} placeholder="e.g. HVAC Solutions" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel>Status</FieldLabel>
              <Select
                value={form.status}
                onChange={(v) => setForm({ ...form, status: v as Status })}
                options={[
                  { label: 'Open', value: 'Open' },
                  { label: 'In Progress', value: 'In Progress' },
                  { label: 'Scheduled', value: 'Scheduled' },
                  { label: 'Completed', value: 'Completed' },
                ]}
              />
            </div>
            <div>
              <FieldLabel>Priority</FieldLabel>
              <Select
                value={form.priority}
                onChange={(v) => setForm({ ...form, priority: v as Priority })}
                options={[
                  { label: 'Critical', value: 'Critical' },
                  { label: 'High', value: 'High' },
                  { label: 'Medium', value: 'Medium' },
                  { label: 'Low', value: 'Low' },
                ]}
              />
            </div>
          </div>
          <div>
            <FieldLabel>Notes</FieldLabel>
            <TextArea value={form.notes || ''} onChange={(v) => setForm({ ...form, notes: v })} placeholder="Additional context..." />
          </div>
        </div>
      </EditModal>
    </div>
  );
}

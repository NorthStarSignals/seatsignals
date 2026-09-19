'use client';

import { useState, useMemo } from 'react';
import { MetricCard } from '@/components/ui/metric-card';
import {
  Users, Search, Mail, Phone, Shield, Calendar, Plus, Pencil, Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import { useCrudApi } from '@/hooks/use-crud-api';
import {
  EditModal, FieldLabel, TextInput, Select, PrimaryButton, GhostButton, DangerButton,
} from '@/components/dashboard/edit-modal';

interface Employee {
  id: string;
  name: string;
  role: string;
  department: string;
  email: string;
  phone: string;
  hire_date: string;
  status: 'active' | 'inactive' | 'on_leave';
  hourly_rate: number;
  certifications: string[];
  emergency_contact: string;
  emergency_phone: string;
}

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-green-500/10 text-green-400',
  inactive: 'bg-zinc-800 text-zinc-400',
  on_leave: 'bg-amber-500/10 text-amber-400',
};

const DEPT_COLORS: Record<string, string> = {
  Management: 'bg-purple-500/10 text-purple-400',
  Kitchen: 'bg-orange-500/10 text-orange-400',
  'Front of House': 'bg-blue-500/10 text-blue-400',
  Bar: 'bg-amber-500/10 text-amber-400',
};

const DEPARTMENTS = ['Management', 'Kitchen', 'Front of House', 'Bar'];
const ROLES = ['Manager', 'Chef', 'Sous Chef', 'Line Cook', 'Server', 'Host', 'Bartender', 'Dishwasher'];

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const INITIAL_EMPLOYEES: Employee[] = [
  { id: '1', name: 'Marco Silva', role: 'Server', department: 'Front of House', email: 'marco@example.com', phone: '555-0101', hire_date: '2024-03-15', status: 'active', hourly_rate: 16, certifications: ['TIPS'], emergency_contact: 'Ana Silva', emergency_phone: '555-1101' },
  { id: '2', name: 'Sarah Chen', role: 'Bartender', department: 'Bar', email: 'sarah@example.com', phone: '555-0102', hire_date: '2023-07-01', status: 'active', hourly_rate: 18, certifications: ['TIPS', 'Mixology'], emergency_contact: 'David Chen', emergency_phone: '555-1102' },
  { id: '3', name: 'James Park', role: 'Sous Chef', department: 'Kitchen', email: 'james@example.com', phone: '555-0103', hire_date: '2022-11-20', status: 'active', hourly_rate: 26, certifications: ['ServSafe'], emergency_contact: 'Mira Park', emergency_phone: '555-1103' },
  { id: '4', name: 'Lisa Rodriguez', role: 'Host', department: 'Front of House', email: 'lisa@example.com', phone: '555-0104', hire_date: '2025-01-10', status: 'active', hourly_rate: 15, certifications: [], emergency_contact: 'Jose Rodriguez', emergency_phone: '555-1104' },
  { id: '5', name: 'David Kim', role: 'Line Cook', department: 'Kitchen', email: 'david@example.com', phone: '555-0105', hire_date: '2024-06-05', status: 'on_leave', hourly_rate: 19, certifications: ['Food Handler'], emergency_contact: 'Mina Kim', emergency_phone: '555-1105' },
  { id: '6', name: 'Emma Wilson', role: 'Server', department: 'Front of House', email: 'emma@example.com', phone: '555-0106', hire_date: '2023-09-22', status: 'active', hourly_rate: 17, certifications: ['TIPS'], emergency_contact: 'Henry Wilson', emergency_phone: '555-1106' },
];

function emptyEmployee(): Employee {
  return {
    id: '',
    name: '',
    role: 'Server',
    department: 'Front of House',
    email: '',
    phone: '',
    hire_date: new Date().toISOString().split('T')[0],
    status: 'active',
    hourly_rate: 15,
    certifications: [],
    emergency_contact: '',
    emergency_phone: '',
  };
}

export default function StaffDirectoryPage() {
  const { items: employees, add, update, remove } = useCrudApi<Employee>('/api/staff-members');
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [form, setForm] = useState<Employee>(emptyEmployee());

  const openAdd = () => {
    setEditing(null);
    setForm(emptyEmployee());
    setModalOpen(true);
  };
  const openEdit = (emp: Employee) => {
    setEditing(emp);
    setForm(emp);
    setModalOpen(true);
  };
  const save = () => {
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    if (editing) {
      update(editing.id, form);
      toast.success('Employee updated');
    } else {
      add({ ...form });
      toast.success('Employee added');
    }
    setModalOpen(false);
  };
  const del = (emp: Employee) => {
    if (!confirm(`Remove ${emp.name}?`)) return;
    remove(emp.id);
    toast.success('Employee removed');
  };

  const filtered = useMemo(() => employees.filter((e) => {
    if (deptFilter !== 'all' && e.department !== deptFilter) return false;
    const q = search.toLowerCase();
    if (q && !e.name.toLowerCase().includes(q) && !e.role.toLowerCase().includes(q)) return false;
    return true;
  }), [employees, deptFilter, search]);

  const stats = useMemo(() => ({
    total: employees.length,
    active: employees.filter((e) => e.status === 'active').length,
    departments: new Set(employees.map((e) => e.department)).size,
    certified: employees.filter((e) => e.certifications.length > 0).length,
  }), [employees]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-seat-red/10 flex items-center justify-center">
            <Users className="w-5 h-5 text-seat-red" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Staff Directory</h1>
            <p className="text-sm text-zinc-500">Employee profiles and contact info</p>
          </div>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-seat-red text-white rounded-lg text-sm font-medium hover:bg-seat-red/90 transition">
          <Plus size={16} /> Add Employee
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard title="Total Staff" value={stats.total} icon={<Users size={18} />} />
        <MetricCard title="Active" value={stats.active} icon={<Users size={18} />} />
        <MetricCard title="Departments" value={stats.departments} icon={<Users size={18} />} />
        <MetricCard title="Certified" value={stats.certified} icon={<Shield size={18} />} />
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or role..."
            className="w-full pl-9 pr-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-seat-red"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setDeptFilter('all')} className={cn('px-3 py-2 rounded-lg text-xs font-medium transition-colors', deptFilter === 'all' ? 'bg-seat-red text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white')}>All</button>
          {DEPARTMENTS.map((d) => (
            <button key={d} onClick={() => setDeptFilter(d)} className={cn('px-3 py-2 rounded-lg text-xs font-medium transition-colors', deptFilter === d ? 'bg-seat-red text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white')}>
              {d}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        {filtered.length === 0 && (
          <div className="text-center py-12 text-zinc-500 text-sm">No employees match your filters.</div>
        )}
        {filtered.map((emp) => (
          <div key={emp.id} className="bg-seat-card border border-seat-border rounded-xl overflow-hidden hover:border-zinc-600 transition-colors">
            <div className="p-4 flex items-center gap-4 cursor-pointer" onClick={() => setExpanded(expanded === emp.id ? null : emp.id)}>
              <div className="w-10 h-10 rounded-full bg-seat-red/10 flex items-center justify-center text-seat-red text-sm font-bold flex-shrink-0">
                {emp.name.split(' ').map((n) => n[0]).join('')}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-semibold text-white">{emp.name}</h3>
                  <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-medium', DEPT_COLORS[emp.department] || 'bg-zinc-800 text-zinc-400')}>{emp.department}</span>
                  <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-medium', STATUS_STYLES[emp.status])}>{emp.status.replace('_', ' ')}</span>
                </div>
                <p className="text-xs text-zinc-400 mt-0.5">{emp.role}</p>
              </div>
              <div className="hidden md:flex items-center gap-4 text-xs text-zinc-400 flex-shrink-0">
                <span className="flex items-center gap-1"><Mail size={10} /> {emp.email}</span>
                <span className="flex items-center gap-1"><Phone size={10} /> {emp.phone}</span>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button onClick={(e) => { e.stopPropagation(); openEdit(emp); }} className="p-2 text-zinc-400 hover:text-white rounded hover:bg-zinc-800">
                  <Pencil size={14} />
                </button>
                <button onClick={(e) => { e.stopPropagation(); del(emp); }} className="p-2 text-zinc-400 hover:text-red-400 rounded hover:bg-zinc-800">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
            {expanded === emp.id && (
              <div className="px-4 pb-4 pt-0 border-t border-seat-border/50 mt-0 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-[10px] text-zinc-500 mb-1">Hire Date</p>
                  <p className="text-xs text-white flex items-center gap-1"><Calendar size={10} /> {new Date(emp.hire_date).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-[10px] text-zinc-500 mb-1">Certifications</p>
                  <div className="flex flex-wrap gap-1">
                    {emp.certifications.length > 0 ? emp.certifications.map((c) => (
                      <span key={c} className="text-[10px] px-1.5 py-0.5 bg-green-500/10 text-green-400 rounded">{c}</span>
                    )) : <span className="text-[10px] text-zinc-600">None</span>}
                  </div>
                </div>
                <div>
                  <p className="text-[10px] text-zinc-500 mb-1">Emergency Contact</p>
                  <p className="text-xs text-white">{emp.emergency_contact || '—'}</p>
                  <p className="text-[10px] text-zinc-400">{emp.emergency_phone}</p>
                </div>
                <div>
                  <p className="text-[10px] text-zinc-500 mb-1">Hourly Rate</p>
                  <p className="text-xs text-white">${emp.hourly_rate.toFixed(2)}/hr</p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <EditModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Employee' : 'Add Employee'}
        maxWidth="lg"
        footer={
          <>
            <GhostButton onClick={() => setModalOpen(false)}>Cancel</GhostButton>
            {editing && <DangerButton onClick={() => { del(editing); setModalOpen(false); }}>Delete</DangerButton>}
            <PrimaryButton onClick={save}>{editing ? 'Save changes' : 'Add employee'}</PrimaryButton>
          </>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <FieldLabel>Name</FieldLabel>
            <TextInput value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="Jane Doe" />
          </div>
          <div>
            <FieldLabel>Role</FieldLabel>
            <Select value={form.role} onChange={(v) => setForm({ ...form, role: v })} options={ROLES.map((r) => ({ label: r, value: r }))} />
          </div>
          <div>
            <FieldLabel>Department</FieldLabel>
            <Select value={form.department} onChange={(v) => setForm({ ...form, department: v })} options={DEPARTMENTS.map((d) => ({ label: d, value: d }))} />
          </div>
          <div>
            <FieldLabel>Status</FieldLabel>
            <Select
              value={form.status}
              onChange={(v) => setForm({ ...form, status: v as Employee['status'] })}
              options={[{ label: 'Active', value: 'active' }, { label: 'On Leave', value: 'on_leave' }, { label: 'Inactive', value: 'inactive' }]}
            />
          </div>
          <div>
            <FieldLabel>Email</FieldLabel>
            <TextInput value={form.email} onChange={(v) => setForm({ ...form, email: v })} placeholder="name@example.com" type="email" />
          </div>
          <div>
            <FieldLabel>Phone</FieldLabel>
            <TextInput value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} placeholder="555-0100" />
          </div>
          <div>
            <FieldLabel>Hire Date</FieldLabel>
            <TextInput value={form.hire_date} onChange={(v) => setForm({ ...form, hire_date: v })} type="date" />
          </div>
          <div>
            <FieldLabel>Hourly Rate</FieldLabel>
            <TextInput value={form.hourly_rate} onChange={(v) => setForm({ ...form, hourly_rate: Number(v) || 0 })} type="number" />
          </div>
          <div>
            <FieldLabel>Certifications (comma-separated)</FieldLabel>
            <TextInput
              value={form.certifications.join(', ')}
              onChange={(v) => setForm({ ...form, certifications: v.split(',').map((s) => s.trim()).filter(Boolean) })}
              placeholder="TIPS, ServSafe"
            />
          </div>
          <div>
            <FieldLabel>Emergency Contact</FieldLabel>
            <TextInput value={form.emergency_contact} onChange={(v) => setForm({ ...form, emergency_contact: v })} />
          </div>
          <div>
            <FieldLabel>Emergency Phone</FieldLabel>
            <TextInput value={form.emergency_phone} onChange={(v) => setForm({ ...form, emergency_phone: v })} />
          </div>
        </div>
      </EditModal>
    </div>
  );
}

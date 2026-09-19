'use client';

import { useState } from 'react';
import { MetricCard } from '@/components/ui/metric-card';
import { cn } from '@/lib/utils';
import { useCrudList } from '@/hooks/use-local-storage-state';
import {
  EditModal,
  FieldLabel,
  TextInput,
  PrimaryButton,
  GhostButton,
} from '@/components/dashboard/edit-modal';
import toast from 'react-hot-toast';
import { Shield, Users, Lock, Settings, Pencil, Trash2, Plus } from 'lucide-react';

interface Role {
  id: string;
  name: string;
  description: string;
  members: number;
  permissions: Record<string, boolean>;
  color: string;
}

const permissionLabels: Record<string, string> = {
  view_dashboard: 'View Dashboard',
  manage_menu: 'Manage Menu',
  manage_staff: 'Manage Staff',
  view_analytics: 'View Analytics',
  manage_inventory: 'Manage Inventory',
  manage_reservations: 'Manage Reservations',
  manage_customers: 'Manage Customers',
  manage_billing: 'Manage Billing',
  manage_settings: 'Manage Settings',
  export_data: 'Export Data',
  manage_campaigns: 'Manage Campaigns',
  view_financials: 'View Financials',
};

const DEFAULT_ROLES: Role[] = [
  { id: 'owner', name: 'Owner', description: 'Full access to everything', members: 1, color: 'bg-red-500',
    permissions: Object.fromEntries(Object.keys(permissionLabels).map(k => [k, true])) },
  { id: 'manager', name: 'General Manager', description: 'Full operational access', members: 2, color: 'bg-amber-500',
    permissions: { view_dashboard: true, manage_menu: true, manage_staff: true, view_analytics: true, manage_inventory: true, manage_reservations: true, manage_customers: true, manage_billing: false, manage_settings: false, export_data: true, manage_campaigns: true, view_financials: true } },
  { id: 'supervisor', name: 'Shift Supervisor', description: 'Day-to-day operations', members: 4, color: 'bg-blue-500',
    permissions: { view_dashboard: true, manage_menu: false, manage_staff: true, view_analytics: true, manage_inventory: true, manage_reservations: true, manage_customers: true, manage_billing: false, manage_settings: false, export_data: false, manage_campaigns: false, view_financials: false } },
  { id: 'server', name: 'Server', description: 'Limited front-of-house access', members: 12, color: 'bg-green-500',
    permissions: { view_dashboard: true, manage_menu: false, manage_staff: false, view_analytics: false, manage_inventory: false, manage_reservations: true, manage_customers: true, manage_billing: false, manage_settings: false, export_data: false, manage_campaigns: false, view_financials: false } },
  { id: 'kitchen', name: 'Kitchen Staff', description: 'Kitchen and inventory access', members: 8, color: 'bg-purple-500',
    permissions: { view_dashboard: true, manage_menu: true, manage_staff: false, view_analytics: false, manage_inventory: true, manage_reservations: false, manage_customers: false, manage_billing: false, manage_settings: false, export_data: false, manage_campaigns: false, view_financials: false } },
];

const COLOR_OPTIONS = [
  'bg-red-500', 'bg-amber-500', 'bg-blue-500', 'bg-green-500',
  'bg-purple-500', 'bg-pink-500', 'bg-cyan-500', 'bg-orange-500',
];

const emptyRoleForm = () => ({
  name: '',
  description: '',
  members: 0,
  color: 'bg-blue-500',
  permissions: Object.fromEntries(Object.keys(permissionLabels).map(k => [k, false])) as Record<string, boolean>,
});

export default function RolesPage() {
  const { items: roles, add, update, remove } = useCrudList<Role>(
    'seatsignals_settings_roles',
    DEFAULT_ROLES
  );
  const [selectedRole, setSelectedRole] = useState<string>(DEFAULT_ROLES[0].id);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ReturnType<typeof emptyRoleForm>>(emptyRoleForm());

  const totalMembers = roles.reduce((s, r) => s + r.members, 0);
  const activeRole = roles.find(r => r.id === selectedRole) ?? roles[0];

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyRoleForm());
    setShowModal(true);
  };

  const openEdit = (r: Role) => {
    setEditingId(r.id);
    setForm({
      name: r.name,
      description: r.description,
      members: r.members,
      color: r.color,
      permissions: { ...r.permissions },
    });
    setShowModal(true);
  };

  const saveRole = () => {
    if (!form.name.trim()) {
      toast.error('Role name is required');
      return;
    }
    if (editingId) {
      update(editingId, form);
      toast.success('Role updated');
    } else {
      const id = `role-${Date.now()}`;
      add({ id, ...form });
      toast.success('Role added');
      setSelectedRole(id);
    }
    setShowModal(false);
  };

  const deleteRole = (id: string) => {
    if (!confirm('Delete this role?')) return;
    remove(id);
    if (selectedRole === id && roles.length > 1) {
      const next = roles.find(r => r.id !== id);
      if (next) setSelectedRole(next.id);
    }
    toast.success('Deleted');
  };

  const togglePermission = (roleId: string, key: string) => {
    const role = roles.find(r => r.id === roleId);
    if (!role) return;
    update(roleId, {
      permissions: { ...role.permissions, [key]: !role.permissions[key] },
    });
  };

  if (!activeRole) {
    return (
      <div className="p-6">
        <p className="text-zinc-400 text-sm mb-4">No roles defined.</p>
        <button
          onClick={openAdd}
          className="px-4 py-2 bg-seat-red text-white rounded-lg text-sm font-medium"
        >
          Add First Role
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-seat-red/10 flex items-center justify-center">
            <Shield className="w-5 h-5 text-seat-red" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Roles & Permissions</h1>
            <p className="text-sm text-zinc-500">Configure access levels for your team</p>
          </div>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 bg-seat-red text-white rounded-lg text-sm font-medium hover:bg-seat-red/90"
        >
          <Plus size={14} /> Add Role
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard title="Total Roles" value={roles.length} icon={<Shield size={18} />} />
        <MetricCard title="Team Members" value={totalMembers} icon={<Users size={18} />} />
        <MetricCard title="Permissions" value={Object.keys(permissionLabels).length} icon={<Lock size={18} />} />
        <MetricCard title="Custom Roles" value={roles.filter(r => !DEFAULT_ROLES.some(d => d.id === r.id)).length} icon={<Settings size={18} />} />
      </div>

      <div className="flex gap-2 flex-wrap">
        {roles.map(r => (
          <button key={r.id} onClick={() => setSelectedRole(r.id)}
            className={cn('flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              selectedRole === r.id ? 'bg-seat-red text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white')}>
            <div className={cn('w-2 h-2 rounded-full', r.color)} />
            {r.name}
            <span className="text-[10px] opacity-60">({r.members})</span>
          </button>
        ))}
      </div>

      <div className="bg-seat-card border border-seat-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-white">{activeRole.name}</h3>
            <p className="text-sm text-zinc-500">{activeRole.description}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => openEdit(activeRole)}
              className="inline-flex items-center gap-1 text-xs px-3 py-1.5 bg-zinc-800 text-zinc-300 rounded border border-zinc-700 hover:text-white"
            >
              <Pencil size={12} /> Edit
            </button>
            <button
              onClick={() => deleteRole(activeRole.id)}
              className="inline-flex items-center gap-1 text-xs px-3 py-1.5 bg-red-900/30 text-red-400 rounded border border-red-900/50 hover:bg-red-900/50"
            >
              <Trash2 size={12} /> Delete
            </button>
            <div className="text-right pl-3">
              <p className="text-2xl font-bold text-white">{activeRole.members}</p>
              <p className="text-[10px] text-zinc-500">members</p>
            </div>
          </div>
        </div>

        <h4 className="text-[10px] text-zinc-500 uppercase tracking-wider mb-3">Permissions</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {Object.entries(permissionLabels).map(([key, label]) => (
            <div key={key} className="flex items-center justify-between py-2 px-3 rounded-lg bg-zinc-800/30">
              <span className="text-sm text-zinc-300">{label}</span>
              <button
                onClick={() => togglePermission(activeRole.id, key)}
                className={cn('w-8 h-5 rounded-full flex items-center transition-colors px-0.5',
                  activeRole.permissions[key] ? 'bg-green-500/20 justify-end' : 'bg-zinc-700 justify-start')}
              >
                <div className={cn('w-4 h-4 rounded-full',
                  activeRole.permissions[key] ? 'bg-green-400' : 'bg-zinc-500')} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-seat-card border border-seat-border rounded-xl p-5">
        <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-3">Permission Matrix</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] text-zinc-500 uppercase border-b border-seat-border">
                <th className="text-left py-2 px-2">Permission</th>
                {roles.map(r => (
                  <th key={r.id} className="text-center py-2 px-2">{r.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.entries(permissionLabels).map(([key, label]) => (
                <tr key={key} className="border-b border-seat-border/30">
                  <td className="py-2 px-2 text-zinc-300 text-xs">{label}</td>
                  {roles.map(r => (
                    <td key={r.id} className="py-2 px-2 text-center">
                      {r.permissions[key]
                        ? <span className="text-green-400">✓</span>
                        : <span className="text-zinc-600">—</span>
                      }
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <EditModal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editingId ? 'Edit Role' : 'Add Role'}
        maxWidth="lg"
        footer={
          <>
            <GhostButton onClick={() => setShowModal(false)}>Cancel</GhostButton>
            <PrimaryButton onClick={saveRole}>{editingId ? 'Save Changes' : 'Add Role'}</PrimaryButton>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <FieldLabel>Role Name</FieldLabel>
            <TextInput value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} placeholder="e.g. Marketing Manager" />
          </div>
          <div>
            <FieldLabel>Description</FieldLabel>
            <TextInput value={form.description} onChange={v => setForm(f => ({ ...f, description: v }))} placeholder="Short summary of responsibilities" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel>Members</FieldLabel>
              <TextInput
                type="number"
                value={form.members}
                onChange={v => setForm(f => ({ ...f, members: parseInt(v) || 0 }))}
              />
            </div>
            <div>
              <FieldLabel>Color</FieldLabel>
              <div className="flex gap-1.5 flex-wrap pt-1">
                {COLOR_OPTIONS.map(c => (
                  <button
                    key={c}
                    onClick={() => setForm(f => ({ ...f, color: c }))}
                    className={cn('w-6 h-6 rounded-full', c,
                      form.color === c ? 'ring-2 ring-white' : 'opacity-60 hover:opacity-100')}
                  />
                ))}
              </div>
            </div>
          </div>
          <div>
            <FieldLabel>Permissions</FieldLabel>
            <div className="grid grid-cols-2 gap-1.5 mt-1">
              {Object.entries(permissionLabels).map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 cursor-pointer text-sm text-zinc-300 py-1">
                  <input
                    type="checkbox"
                    checked={form.permissions[key] || false}
                    onChange={e =>
                      setForm(f => ({
                        ...f,
                        permissions: { ...f.permissions, [key]: e.target.checked },
                      }))
                    }
                    className="w-4 h-4 rounded border-zinc-600 bg-seat-black"
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>
        </div>
      </EditModal>
    </div>
  );
}

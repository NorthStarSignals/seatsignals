'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/utils';
import { ROLES, PERMISSIONS, hasPermission, type Role, type Permission } from '@/lib/roles';
import toast from 'react-hot-toast';
import {
  Users, UserPlus, Shield, Crown, Trash2, Check, X, ChevronDown, ChevronRight, Pencil,
} from 'lucide-react';
import { useCrudList } from '@/hooks/use-local-storage-state';
import {
  EditModal, FieldLabel, TextInput, Select, PrimaryButton, GhostButton, DangerButton,
} from '@/components/dashboard/edit-modal';

interface TeamMember {
  id: string;
  email: string;
  name: string;
  role: Role;
  invited_at: string;
  accepted_at: string | null;
  active: boolean;
}

const ROLE_COLORS: Record<Role, string> = {
  owner: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  admin: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  manager: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  staff: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  viewer: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30',
};

function RoleBadge({ role }: { role: Role }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full border ${ROLE_COLORS[role]}`}>
      {role === 'owner' && <Crown className="w-3 h-3" />}
      {role === 'admin' && <Shield className="w-3 h-3" />}
      {ROLES[role].label}
    </span>
  );
}

function Avatar({ name, email }: { name: string; email: string }) {
  const display = name || email;
  const initials = display.split(/[\s@]+/).slice(0, 2).map((s) => s[0]?.toUpperCase() || '').join('');
  return (
    <div className="w-9 h-9 rounded-full bg-zinc-700 flex items-center justify-center text-xs font-semibold text-zinc-300 shrink-0">
      {initials}
    </div>
  );
}

function PermissionMatrix() {
  const [expanded, setExpanded] = useState(false);
  const roles = Object.keys(ROLES) as Role[];
  const permissions = Object.keys(PERMISSIONS) as Permission[];
  return (
    <div className="bg-seat-card border border-seat-border rounded-xl overflow-hidden">
      <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center justify-between px-6 py-4 hover:bg-zinc-800/50 transition">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-zinc-400" />
          <span className="text-sm font-medium text-white">Role Permissions</span>
        </div>
        {expanded ? <ChevronDown className="w-4 h-4 text-zinc-500" /> : <ChevronRight className="w-4 h-4 text-zinc-500" />}
      </button>
      {expanded && (
        <div className="px-6 pb-6 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-seat-border">
                <th className="text-left py-2 pr-4 text-zinc-500 font-medium">Permission</th>
                {roles.map((r) => <th key={r} className="text-center py-2 px-3 text-zinc-500 font-medium">{ROLES[r].label}</th>)}
              </tr>
            </thead>
            <tbody>
              {permissions.map((p) => (
                <tr key={p} className="border-b border-zinc-800/50">
                  <td className="py-2 pr-4 text-zinc-400 whitespace-nowrap">{p}</td>
                  {roles.map((r) => (
                    <td key={r} className="text-center py-2 px-3">
                      {hasPermission(r, p)
                        ? <Check className="w-3.5 h-3.5 text-emerald-400 mx-auto" />
                        : <X className="w-3.5 h-3.5 text-zinc-700 mx-auto" />}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const INITIAL: TeamMember[] = [
  { id: '1', email: 'malik@northstarholdings.com', name: 'Malik Alexander', role: 'owner', invited_at: '2025-01-15T10:00:00Z', accepted_at: '2025-01-15T10:05:00Z', active: true },
  { id: '2', email: 'jamie@restaurant.com', name: 'Jamie Walker', role: 'manager', invited_at: '2025-02-01T10:00:00Z', accepted_at: '2025-02-02T11:00:00Z', active: true },
  { id: '3', email: 'chef@restaurant.com', name: 'Chef Mike', role: 'staff', invited_at: '2025-03-01T10:00:00Z', accepted_at: '2025-03-02T09:00:00Z', active: true },
  { id: '4', email: 'newhire@restaurant.com', name: 'New Hire', role: 'viewer', invited_at: '2026-04-10T10:00:00Z', accepted_at: null, active: true },
];

function emptyMember(): Omit<TeamMember, 'id'> {
  return {
    email: '',
    name: '',
    role: 'viewer',
    invited_at: new Date().toISOString(),
    accepted_at: null,
    active: true,
  };
}

export default function TeamPage() {
  const { items: members, add, update, remove } = useCrudList<TeamMember>('seatsignals_team', INITIAL);
  const currentRole: Role = 'owner';
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<TeamMember | null>(null);
  const [form, setForm] = useState<Omit<TeamMember, 'id'>>(emptyMember());

  const openAdd = () => { setEditing(null); setForm(emptyMember()); setModalOpen(true); };
  const openEdit = (m: TeamMember) => { setEditing(m); setForm(m); setModalOpen(true); };
  const save = () => {
    if (!form.email.trim()) { toast.error('Email is required'); return; }
    if (editing) {
      update(editing.id, form);
      toast.success('Member updated');
    } else {
      add({ ...form, id: Date.now().toString() });
      toast.success(`Invite sent to ${form.email}`);
    }
    setModalOpen(false);
  };
  const del = (m: TeamMember) => {
    if (m.role === 'owner') { toast.error('Cannot remove owner'); return; }
    if (!confirm(`Remove ${m.name || m.email}?`)) return;
    remove(m.id);
    toast.success('Member removed');
  };

  const assignableRoles = (Object.keys(ROLES) as Role[]).filter((r) => ROLES[r].level < ROLES[currentRole].level);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Users className="w-7 h-7 text-seat-red" /> Team
          </h1>
          <p className="text-sm text-zinc-500 mt-1">Manage who has access to your dashboard</p>
        </div>
        <Button onClick={openAdd}>
          <UserPlus className="w-4 h-4" /> Invite Member
        </Button>
      </div>

      <div className="bg-seat-card border border-seat-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-seat-border">
                <th className="text-left px-6 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Member</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Role</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Joined</th>
                <th className="text-right px-6 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {members.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-zinc-500 text-sm">No team members yet. Invite someone to get started.</td></tr>
              ) : (
                members.map((member) => (
                  <tr key={member.id} className="hover:bg-zinc-800/30 transition">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar name={member.name} email={member.email} />
                        <div>
                          <p className="text-sm font-medium text-white">{member.name || 'Unnamed'}</p>
                          <p className="text-xs text-zinc-500">{member.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4"><RoleBadge role={member.role} /></td>
                    <td className="px-6 py-4">
                      {member.accepted_at ? (
                        <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400">
                          <span className="w-2 h-2 rounded-full bg-emerald-400" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs text-amber-400">
                          <span className="w-2 h-2 rounded-full bg-amber-400" /> Pending Invite
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs text-zinc-500">
                      {formatDate(member.accepted_at || member.invited_at)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => openEdit(member)} className="p-1 text-zinc-400 hover:text-white inline-flex"><Pencil className="w-4 h-4" /></button>
                      {member.role !== 'owner' && (
                        <button onClick={() => del(member)} className="p-1 text-zinc-600 hover:text-red-400 ml-1 inline-flex">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <PermissionMatrix />

      <EditModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Member' : 'Invite Team Member'}
        footer={
          <>
            <GhostButton onClick={() => setModalOpen(false)}>Cancel</GhostButton>
            {editing && editing.role !== 'owner' && (
              <DangerButton onClick={() => { del(editing); setModalOpen(false); }}>Remove</DangerButton>
            )}
            <PrimaryButton onClick={save}>{editing ? 'Save' : 'Send Invite'}</PrimaryButton>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <FieldLabel>Email</FieldLabel>
            <TextInput value={form.email} onChange={(v) => setForm({ ...form, email: v })} placeholder="team@restaurant.com" type="email" />
          </div>
          <div>
            <FieldLabel>Name</FieldLabel>
            <TextInput value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="Team member name" />
          </div>
          <div>
            <FieldLabel>Role</FieldLabel>
            <Select
              value={form.role}
              onChange={(v) => setForm({ ...form, role: v as Role })}
              options={(editing?.role === 'owner' ? ['owner'] : assignableRoles).map((r) => ({ label: `${ROLES[r as Role].label} — ${ROLES[r as Role].description}`, value: r }))}
            />
          </div>
        </div>
      </EditModal>
    </div>
  );
}

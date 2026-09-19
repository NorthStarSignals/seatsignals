export const ROLES = {
  owner: { label: 'Owner', level: 100, description: 'Full access to everything' },
  admin: { label: 'Admin', level: 80, description: 'Manage team, settings, and all features' },
  manager: { label: 'Manager', level: 60, description: 'View analytics, manage customers and sequences' },
  staff: { label: 'Staff', level: 40, description: 'View customers, redeem offers' },
  viewer: { label: 'Viewer', level: 20, description: 'View-only access to dashboard' },
} as const;

export type Role = keyof typeof ROLES;

export const PERMISSIONS = {
  'customers.view': ['owner', 'admin', 'manager', 'staff', 'viewer'],
  'customers.edit': ['owner', 'admin', 'manager'],
  'customers.delete': ['owner', 'admin'],
  'sequences.view': ['owner', 'admin', 'manager', 'viewer'],
  'sequences.edit': ['owner', 'admin', 'manager'],
  'reviews.respond': ['owner', 'admin', 'manager'],
  'analytics.view': ['owner', 'admin', 'manager', 'viewer'],
  'settings.edit': ['owner', 'admin'],
  'team.manage': ['owner', 'admin'],
  'billing.manage': ['owner'],
  'catering.manage': ['owner', 'admin', 'manager'],
  'promotions.manage': ['owner', 'admin', 'manager'],
  'webhooks.manage': ['owner', 'admin'],
  'data.export': ['owner', 'admin'],
  'data.delete': ['owner'],
} as const;

export type Permission = keyof typeof PERMISSIONS;

export function hasPermission(role: Role, permission: Permission): boolean {
  const allowedRoles = PERMISSIONS[permission];
  return (allowedRoles as readonly string[]).includes(role);
}

export function getRoleLabel(role: Role): string {
  return ROLES[role]?.label ?? role;
}

export function getRoleLevel(role: Role): number {
  return ROLES[role]?.level ?? 0;
}

export function canAssignRole(assignerRole: Role, targetRole: Role): boolean {
  return getRoleLevel(assignerRole) > getRoleLevel(targetRole);
}

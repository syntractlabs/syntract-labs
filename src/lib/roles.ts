/**
 * Role-based access control helpers for SynTract Labs.
 *
 * Roles:
 *   admin     — full access: builds, projects, users, org settings
 *   developer — create builds, manage projects, download code
 *   viewer    — read-only access to builds and projects
 */

export type UserRole = 'admin' | 'developer' | 'viewer';

export const ROLES: UserRole[] = ['admin', 'developer', 'viewer'];

export const ROLE_LABELS: Record<UserRole, string> = {
  admin:     'Admin',
  developer: 'Developer',
  viewer:    'Viewer',
};

export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  admin:     'Full access to all builds, projects, users, and organization settings.',
  developer: 'Can create builds, manage projects, and download code.',
  viewer:    'Read-only access to builds and projects.',
};

// ── Permission checks ─────────────────────────────────────────────────────────

export function canCreateBuild(role: UserRole): boolean {
  return role === 'admin' || role === 'developer';
}

export function canManageProjects(role: UserRole): boolean {
  return role === 'admin' || role === 'developer';
}

export function canDownloadCode(role: UserRole): boolean {
  return role === 'admin' || role === 'developer';
}

export function canManageUsers(role: UserRole): boolean {
  return role === 'admin';
}

export function canManageOrgSettings(role: UserRole): boolean {
  return role === 'admin';
}

export function canViewBuilds(role: UserRole): boolean {
  return true; // all roles
}

export function isValidRole(value: unknown): value is UserRole {
  return typeof value === 'string' && ROLES.includes(value as UserRole);
}

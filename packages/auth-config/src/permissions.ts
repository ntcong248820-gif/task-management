import { createAccessControl } from 'better-auth/plugins/access';

const statements = {
  organization: ['read', 'update', 'delete'],
  member: ['read', 'create', 'update', 'delete'],
  invitation: ['read', 'create', 'cancel'],
  team: ['read', 'create', 'update', 'delete'],
  ac: ['create', 'read', 'update', 'delete'],
  project: ['create', 'read', 'update', 'delete'],
  task: ['create', 'read', 'update', 'delete'],
} as const;

export const workspaceAccessControl = createAccessControl(statements);

export const owner = workspaceAccessControl.newRole({
  organization: ['read', 'update', 'delete'],
  member: ['read', 'create', 'update', 'delete'],
  invitation: ['read', 'create', 'cancel'],
  team: ['read', 'create', 'update', 'delete'],
  ac: ['create', 'read', 'update', 'delete'],
  project: ['create', 'read', 'update', 'delete'],
  task: ['create', 'read', 'update', 'delete'],
});

export const admin = workspaceAccessControl.newRole({
  organization: ['read', 'update'],
  member: ['read', 'create', 'update', 'delete'],
  invitation: ['read', 'create', 'cancel'],
  team: ['read', 'create', 'update', 'delete'],
  ac: ['read'],
  project: ['create', 'read', 'update', 'delete'],
  task: ['create', 'read', 'update', 'delete'],
});

export const member = workspaceAccessControl.newRole({
  organization: ['read'],
  member: ['read'],
  invitation: ['read'],
  team: ['read'],
  ac: ['read'],
  project: ['create', 'read', 'update'],
  task: ['create', 'read', 'update'],
});

export const viewer = workspaceAccessControl.newRole({
  organization: ['read'],
  member: ['read'],
  invitation: [],
  team: ['read'],
  ac: ['read'],
  project: ['read'],
  task: ['read'],
});

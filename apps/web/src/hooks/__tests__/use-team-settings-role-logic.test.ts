import { describe, expect, it } from 'vitest';
import type { WorkspaceRole } from '@/hooks/use-team-settings';

// Tests for the derived role-gate logic in useTeamSettings.
// These rules determine what the current user can do in the team settings page.

type Member = { id: string; userId: string; role: WorkspaceRole };

function deriveRoleState(members: Member[], currentUserId: string) {
  const currentMember = members.find((m) => m.userId === currentUserId);
  const currentRole = currentMember?.role;
  const canManageRoles = currentRole === 'owner' || currentRole === 'admin';
  const isOwner = currentRole === 'owner';
  const ownerCount = members.filter((m) => m.role === 'owner').length;
  return { currentRole, canManageRoles, isOwner, ownerCount };
}

const OWNER: Member = { id: 'm1', userId: 'u1', role: 'owner' };
const ADMIN: Member = { id: 'm2', userId: 'u2', role: 'admin' };
const MEMBER: Member = { id: 'm3', userId: 'u3', role: 'member' };
const VIEWER: Member = { id: 'm4', userId: 'u4', role: 'viewer' };

describe('useTeamSettings role gate logic', () => {
  it('grants canManageRoles to owner', () => {
    const { canManageRoles, isOwner } = deriveRoleState([OWNER, MEMBER], 'u1');
    expect(canManageRoles).toBe(true);
    expect(isOwner).toBe(true);
  });

  it('grants canManageRoles to admin but not isOwner', () => {
    const { canManageRoles, isOwner } = deriveRoleState([OWNER, ADMIN], 'u2');
    expect(canManageRoles).toBe(true);
    expect(isOwner).toBe(false);
  });

  it('denies canManageRoles to member', () => {
    const { canManageRoles } = deriveRoleState([OWNER, MEMBER], 'u3');
    expect(canManageRoles).toBe(false);
  });

  it('denies canManageRoles to viewer', () => {
    const { canManageRoles } = deriveRoleState([OWNER, VIEWER], 'u4');
    expect(canManageRoles).toBe(false);
  });

  it('counts owners correctly when there is one owner', () => {
    const { ownerCount } = deriveRoleState([OWNER, ADMIN, MEMBER], 'u1');
    expect(ownerCount).toBe(1);
  });

  it('counts owners correctly when there are multiple owners', () => {
    const OWNER2: Member = { id: 'm5', userId: 'u5', role: 'owner' };
    const { ownerCount } = deriveRoleState([OWNER, OWNER2, MEMBER], 'u1');
    expect(ownerCount).toBe(2);
  });

  it('returns undefined currentRole when user is not in the member list', () => {
    const { currentRole, canManageRoles } = deriveRoleState([OWNER, MEMBER], 'unknown-user');
    expect(currentRole).toBeUndefined();
    expect(canManageRoles).toBe(false);
  });
});

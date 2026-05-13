"use client"

import { createAuthClient } from 'better-auth/react';
import { organizationClient } from 'better-auth/client/plugins';
import { admin, member, owner, viewer, workspaceAccessControl } from '@repo/auth-config/permissions';

const baseURL = process.env.NEXT_PUBLIC_APP_URL;

export const authClient = createAuthClient({
  ...(baseURL ? { baseURL } : {}),
  plugins: [
    organizationClient({
      ac: workspaceAccessControl,
      roles: { owner, admin, member, viewer },
    }),
  ],
});

export const { signIn, signOut, signUp, useSession } = authClient;

import { betterAuth } from 'better-auth';
import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { organization } from 'better-auth/plugins';
import { db } from '@repo/db';
import { admin, member, owner, viewer, workspaceAccessControl } from './permissions';

const appUrl = process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3002';

export const auth = betterAuth({
  baseURL: appUrl,
  secret: process.env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, { provider: 'pg' }),
  account: {
    encryptOAuthTokens: true,
    storeStateStrategy: 'database',
  },
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    requireEmailVerification: false,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
  },
  plugins: [
    organization({
      ac: workspaceAccessControl,
      roles: { owner, admin, member, viewer },
      allowUserToCreateOrganization: true,
      creatorRole: 'owner',
      invitationExpiresIn: 60 * 60 * 24 * 7,
    }),
  ],
});

export type Auth = typeof auth;

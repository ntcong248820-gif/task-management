import { betterAuth } from 'better-auth';
import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { organization } from 'better-auth/plugins';
import { db } from '@repo/db';
import { buildActionEmailHtml, sendAuthEmail } from './email';
import { admin, member, owner, viewer, workspaceAccessControl } from './permissions';

const appUrl = process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3002';
const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

const socialProviders = googleClientId && googleClientSecret
  ? { google: { clientId: googleClientId, clientSecret: googleClientSecret } }
  : undefined;

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
    autoSignIn: false,
    requireEmailVerification: true,
    sendResetPassword: async ({ user, url }) => {
      await sendAuthEmail({
        to: user.email,
        subject: 'Reset your SEO Impact OS password',
        text: `Reset your password: ${url}`,
        html: buildActionEmailHtml('Reset your password', 'Use this link to reset your SEO Impact OS password.', url),
      });
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    sendVerificationEmail: async ({ user, url }) => {
      await sendAuthEmail({
        to: user.email,
        subject: 'Verify your SEO Impact OS email',
        text: `Verify your email: ${url}`,
        html: buildActionEmailHtml('Verify your email', 'Use this link to verify your SEO Impact OS email.', url),
      });
    },
  },
  ...(socialProviders ? { socialProviders } : {}),
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
      sendInvitationEmail: async ({ email, id, organization: invitedOrganization }) => {
        const url = `${appUrl}/workspace?invitationId=${encodeURIComponent(id)}`;
        await sendAuthEmail({
          to: email,
          subject: `Join ${invitedOrganization.name} on SEO Impact OS`,
          text: `Accept your invitation: ${url}`,
          html: buildActionEmailHtml(
            `Join ${invitedOrganization.name}`,
            'Use this link to accept your workspace invitation.',
            url
          ),
        });
      },
    }),
  ],
});

export type Auth = typeof auth;

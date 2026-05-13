import { auth } from '@repo/auth-config';
import { toNextJsHandler } from 'better-auth/next-js';

export const runtime = 'nodejs';

export const { GET, POST } = toNextJsHandler(auth);

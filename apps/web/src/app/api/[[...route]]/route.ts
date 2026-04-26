import { handle } from 'hono/vercel';
import { app } from '@repo/api-app';

// Node.js runtime required — route handlers use googleapis, drizzle-postgres (not Edge-compatible)
export const runtime = 'nodejs';

export const GET = handle(app);
export const POST = handle(app);
export const PUT = handle(app);
export const PATCH = handle(app);
export const DELETE = handle(app);
export const OPTIONS = handle(app);

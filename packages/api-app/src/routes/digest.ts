import { Hono } from 'hono';
import { db, workspaceDigests, eq, desc } from '@repo/db';
import { logger } from '../utils/logger';

const log = logger.child('Digest');
type AppVariables = { workspaceId: string };
const app = new Hono<{ Variables: AppVariables }>();

// GET /api/digest/latest — latest weekly digest for current workspace
app.get('/latest', async (c) => {
  try {
    const workspaceId = c.get('workspaceId');

    const [digest] = await db
      .select()
      .from(workspaceDigests)
      .where(eq(workspaceDigests.workspaceId, workspaceId))
      .orderBy(desc(workspaceDigests.weekStart))
      .limit(1);

    return c.json({ success: true, data: digest ?? null });
  } catch (err) {
    log.error('Error fetching digest', err);
    return c.json({ success: false, error: 'Failed to fetch digest' }, 500);
  }
});

export default app;

import { Hono } from 'hono';
import { z } from 'zod';
import { db, gscConnections, ga4Connections, eq, and } from '@repo/db';

type AppVariables = {
    userId: string;
    workspaceId: string;
};

const app = new Hono<{ Variables: AppVariables }>();
const uuidSchema = z.string().uuid();

const isUuid = (value: string) => uuidSchema.safeParse(value).success;

app.get('/status', async (c) => {
    try {
        const { projectId } = c.req.query();

        if (!projectId) {
            return c.json({ success: false, error: 'Project ID is required' }, 400);
        }

        if (!isUuid(projectId)) {
            return c.json({ success: false, error: 'Invalid project ID' }, 400);
        }

        const workspaceId = c.get('workspaceId');
        const [gscConnection] = await db
            .select()
            .from(gscConnections)
            .where(and(eq(gscConnections.projectId, projectId), eq(gscConnections.workspaceId, workspaceId)))
            .limit(1);

        const [ga4Connection] = await db
            .select()
            .from(ga4Connections)
            .where(and(eq(ga4Connections.projectId, projectId), eq(ga4Connections.workspaceId, workspaceId)))
            .limit(1);

        return c.json({
            success: true,
            data: {
                gsc: gscConnection ? {
                    connected: true,
                    lastSync: gscConnection.lastSyncedAt ?? gscConnection.createdAt,
                    scopes: [],
                    email: gscConnection.accountEmail,
                    syncStatus: gscConnection.syncStatus,
                    syncError: gscConnection.syncError,
                } : {
                    connected: false,
                },
                ga4: ga4Connection ? {
                    connected: true,
                    lastSync: ga4Connection.lastSyncedAt ?? ga4Connection.createdAt,
                    scopes: [],
                    email: ga4Connection.accountEmail,
                    syncStatus: ga4Connection.syncStatus,
                    syncError: ga4Connection.syncError,
                } : {
                    connected: false,
                },
            },
        });
    } catch (error) {
        console.error('Get integration status error:', error);
        return c.json({ success: false, error: 'Failed to get integration status' }, 500);
    }
});

app.delete('/:provider/disconnect', async (c) => {
    try {
        const { provider } = c.req.param();
        const { projectId } = c.req.query();

        if (!projectId) {
            return c.json({ success: false, error: 'Project ID is required' }, 400);
        }

        if (!isUuid(projectId)) {
            return c.json({ success: false, error: 'Invalid project ID' }, 400);
        }

        const workspaceId = c.get('workspaceId');

        if (provider === 'gsc') {
            await db
                .delete(gscConnections)
                .where(and(eq(gscConnections.projectId, projectId), eq(gscConnections.workspaceId, workspaceId)));
        } else if (provider === 'ga4') {
            await db
                .delete(ga4Connections)
                .where(and(eq(ga4Connections.projectId, projectId), eq(ga4Connections.workspaceId, workspaceId)));
        } else {
            return c.json({ success: false, error: 'Invalid provider' }, 400);
        }

        return c.json({
            success: true,
            message: `${provider.toUpperCase()} disconnected successfully`,
        });
    } catch (error) {
        console.error('Disconnect integration error:', error);
        return c.json({ success: false, error: 'Failed to disconnect integration' }, 500);
    }
});

export default app;

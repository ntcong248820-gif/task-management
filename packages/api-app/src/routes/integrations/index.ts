import { Hono } from 'hono';
import { z } from 'zod';
import { db, gscConnections, ga4Connections, eq, and, desc } from '@repo/db';
import { logger } from '../../utils/logger';
import { deriveHealthState } from '../../utils/integration-health';

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
            .where(and(
                eq(gscConnections.projectId, projectId),
                eq(gscConnections.workspaceId, workspaceId),
                eq(gscConnections.isActive, true)
            ))
            .orderBy(desc(gscConnections.updatedAt))
            .limit(1);

        const [ga4Connection] = await db
            .select()
            .from(ga4Connections)
            .where(and(
                eq(ga4Connections.projectId, projectId),
                eq(ga4Connections.workspaceId, workspaceId),
                eq(ga4Connections.isActive, true)
            ))
            .orderBy(desc(ga4Connections.updatedAt))
            .limit(1);

        return c.json({
            success: true,
            data: {
                gsc: gscConnection ? {
                    connected: true,
                    isActive: gscConnection.isActive,
                    lastAttemptedAt: gscConnection.lastAttemptedAt,
                    lastSync: gscConnection.lastSyncedAt,
                    lastRowsSynced: gscConnection.lastRowsSynced,
                    healthState: deriveHealthState({
                        syncStatus: gscConnection.syncStatus,
                        syncError: gscConnection.syncError,
                        lastSyncedAt: gscConnection.lastSyncedAt,
                        lastAttemptedAt: gscConnection.lastAttemptedAt,
                    }),
                    scopes: [],
                    accountEmail: gscConnection.accountEmail,
                    siteUrl: gscConnection.siteUrl,
                    permissionLevel: gscConnection.permissionLevel,
                    syncStatus: gscConnection.syncStatus,
                    syncError: gscConnection.syncError,
                } : {
                    connected: false,
                },
                ga4: ga4Connection ? {
                    connected: true,
                    isActive: ga4Connection.isActive,
                    lastAttemptedAt: ga4Connection.lastAttemptedAt,
                    lastSync: ga4Connection.lastSyncedAt,
                    lastRowsSynced: ga4Connection.lastRowsSynced,
                    healthState: deriveHealthState({
                        syncStatus: ga4Connection.syncStatus,
                        syncError: ga4Connection.syncError,
                        lastSyncedAt: ga4Connection.lastSyncedAt,
                        lastAttemptedAt: ga4Connection.lastAttemptedAt,
                    }),
                    scopes: [],
                    accountEmail: ga4Connection.accountEmail,
                    propertyId: ga4Connection.propertyId,
                    propertyName: ga4Connection.propertyName,
                    measurementId: ga4Connection.measurementId,
                    syncStatus: ga4Connection.syncStatus,
                    syncError: ga4Connection.syncError,
                } : {
                    connected: false,
                },
            },
        });
    } catch (error) {
        logger.error('Get integration status error', error);
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
        logger.error('Disconnect integration error', error);
        return c.json({ success: false, error: 'Failed to disconnect integration' }, 500);
    }
});

export default app;

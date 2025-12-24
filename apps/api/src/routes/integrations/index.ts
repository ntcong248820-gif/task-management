import { Hono } from 'hono';
import { db, oauthTokens, eq, and } from '@repo/db';

const app = new Hono();

/**
 * GET /api/integrations/status
 * Get connection status for all integrations
 */
app.get('/status', async (c) => {
    try {
        const { projectId } = c.req.query();

        if (!projectId) {
            return c.json({ success: false, error: 'Project ID is required' }, 400);
        }

        // Fetch all tokens for this project
        const tokens = await db
            .select({
                provider: oauthTokens.provider,
                createdAt: oauthTokens.createdAt,
                scope: oauthTokens.scope,
                accountEmail: oauthTokens.accountEmail,
            })
            .from(oauthTokens)
            .where(eq(oauthTokens.projectId, parseInt(projectId)));

        // Transform to integration status format
        const integrations = {
            gsc: tokens.find(t => t.provider === 'google_search_console'),
            ga4: tokens.find(t => t.provider === 'google_analytics'),
        };

        return c.json({
            success: true,
            data: {
                gsc: integrations.gsc ? {
                    connected: true,
                    lastSync: integrations.gsc.createdAt,
                    scopes: integrations.gsc.scope?.split(' ') || [],
                    email: integrations.gsc.accountEmail,
                } : {
                    connected: false,
                },
                ga4: integrations.ga4 ? {
                    connected: true,
                    lastSync: integrations.ga4.createdAt,
                    scopes: integrations.ga4.scope?.split(' ') || [],
                    email: integrations.ga4.accountEmail,
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

/**
 * DELETE /api/integrations/:provider/disconnect
 * Disconnect an integration by deleting its tokens
 */
app.delete('/:provider/disconnect', async (c) => {
    try {
        const { provider } = c.req.param();
        const { projectId } = c.req.query();

        if (!projectId) {
            return c.json({ success: false, error: 'Project ID is required' }, 400);
        }

        // Map provider ID to database provider name
        const providerMap: Record<string, string> = {
            gsc: 'google_search_console',
            ga4: 'google_analytics',
        };

        const dbProvider = providerMap[provider];
        if (!dbProvider) {
            return c.json({ success: false, error: 'Invalid provider' }, 400);
        }

        // Delete tokens for this provider
        await db
            .delete(oauthTokens)
            .where(
                and(
                    eq(oauthTokens.projectId, parseInt(projectId)),
                    eq(oauthTokens.provider, dbProvider)
                )
            );

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

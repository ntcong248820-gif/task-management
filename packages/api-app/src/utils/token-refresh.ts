import { google } from 'googleapis';
import { db, gscConnections, ga4Connections, eq, and } from '@repo/db';
import { decryptTokenValue, encryptToken } from './crypto-tokens';
import { logger } from './logger';

const log = logger.child('TokenRefresh');

export type IntegrationKind = 'gsc' | 'ga4';

export interface TokenRecord {
    id: string;
    projectId: string;
    accessToken: string;
    refreshToken: string;
    tokenExpiresAt: Date;
}

export function isTokenExpired(expiresAt: Date): boolean {
    const bufferMs = 5 * 60 * 1000;
    return Date.now() >= expiresAt.getTime() - bufferMs;
}

export async function refreshOAuthTokens(tokenRecord: TokenRecord, kind: IntegrationKind): Promise<string> {
    const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID!,
        process.env.GOOGLE_CLIENT_SECRET!
    );

    oauth2Client.setCredentials({
        refresh_token: decryptTokenValue(tokenRecord.refreshToken),
    });

    log.info(`Refreshing ${kind.toUpperCase()} token for project ${tokenRecord.projectId}`);

    const { credentials } = await oauth2Client.refreshAccessToken();
    const newAccessToken = credentials.access_token;
    const expiryDate = credentials.expiry_date;

    if (!newAccessToken || !expiryDate) {
        throw new Error('Google did not return a refreshed access token');
    }

    const updateData = {
        accessToken: encryptToken(newAccessToken),
        tokenExpiresAt: new Date(expiryDate),
        updatedAt: new Date(),
    };

    if (kind === 'gsc') {
        await db
            .update(gscConnections)
            .set(updateData)
            .where(eq(gscConnections.id, tokenRecord.id));
    } else {
        await db
            .update(ga4Connections)
            .set(updateData)
            .where(eq(ga4Connections.id, tokenRecord.id));
    }

    return newAccessToken;
}

export async function getValidAccessToken(tokenRecord: TokenRecord, kind: IntegrationKind): Promise<string> {
    if (isTokenExpired(tokenRecord.tokenExpiresAt)) {
        return refreshOAuthTokens(tokenRecord, kind);
    }

    return decryptTokenValue(tokenRecord.accessToken);
}

export async function getTokensForProject(
    projectId: string,
    kind: IntegrationKind
): Promise<TokenRecord | null> {
    const table = kind === 'gsc' ? gscConnections : ga4Connections;
    const [tokenRecord] = await db
        .select({
            id: table.id,
            projectId: table.projectId,
            accessToken: table.accessToken,
            refreshToken: table.refreshToken,
            tokenExpiresAt: table.tokenExpiresAt,
        })
        .from(table)
        .where(eq(table.projectId, projectId))
        .limit(1);

    return tokenRecord ?? null;
}

export async function getTokensForProjectInWorkspace(
    projectId: string,
    workspaceId: string,
    kind: IntegrationKind
): Promise<TokenRecord | null> {
    const table = kind === 'gsc' ? gscConnections : ga4Connections;
    const [tokenRecord] = await db
        .select({
            id: table.id,
            projectId: table.projectId,
            accessToken: table.accessToken,
            refreshToken: table.refreshToken,
            tokenExpiresAt: table.tokenExpiresAt,
        })
        .from(table)
        .where(and(eq(table.projectId, projectId), eq(table.workspaceId, workspaceId)))
        .limit(1);

    return tokenRecord ?? null;
}

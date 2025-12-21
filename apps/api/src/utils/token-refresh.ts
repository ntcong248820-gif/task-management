import { google } from 'googleapis';
import { db, oauthTokens, eq, and } from '@repo/db';

interface TokenRecord {
    id: number;
    projectId: number;
    provider: string;
    accessToken: string;
    refreshToken: string;
    expiresAt: Date;
    tokenType: string;
    scope: string;
    accountEmail: string | null;
}

/**
 * Check if token is expired (with 5 minute buffer)
 */
export function isTokenExpired(expiresAt: Date): boolean {
    const bufferMs = 5 * 60 * 1000; // 5 minutes
    return Date.now() >= expiresAt.getTime() - bufferMs;
}

/**
 * Refresh OAuth tokens using refresh token
 * Returns new access token and updates database
 */
export async function refreshOAuthTokens(tokenRecord: TokenRecord): Promise<string> {
    const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID!,
        process.env.GOOGLE_CLIENT_SECRET!,
        process.env.GOOGLE_REDIRECT_URI!
    );

    oauth2Client.setCredentials({
        refresh_token: tokenRecord.refreshToken,
    });

    console.log(`[Token Refresh] Refreshing token for ${tokenRecord.provider}...`);

    const { credentials } = await oauth2Client.refreshAccessToken();

    const newAccessToken = credentials.access_token!;
    const newExpiresAt = new Date(credentials.expiry_date!);

    // Update database with new token
    await db
        .update(oauthTokens)
        .set({
            accessToken: newAccessToken,
            expiresAt: newExpiresAt,
            updatedAt: new Date(),
        })
        .where(eq(oauthTokens.id, tokenRecord.id));

    console.log(`[Token Refresh] Token refreshed successfully. New expiry: ${newExpiresAt.toISOString()}`);

    return newAccessToken;
}

/**
 * Get valid access token - refreshes if expired
 */
export async function getValidAccessToken(tokenRecord: TokenRecord): Promise<string> {
    if (isTokenExpired(tokenRecord.expiresAt)) {
        console.log(`[Token Refresh] Token expired at ${tokenRecord.expiresAt.toISOString()}, refreshing...`);
        return await refreshOAuthTokens(tokenRecord);
    }
    return tokenRecord.accessToken;
}

/**
 * Get OAuth tokens for a project and provider
 * Returns null if not found
 */
export async function getTokensForProject(
    projectId: number,
    provider: 'google_analytics' | 'google_search_console'
): Promise<TokenRecord | null> {
    const [tokenRecord] = await db
        .select()
        .from(oauthTokens)
        .where(
            and(
                eq(oauthTokens.projectId, projectId),
                eq(oauthTokens.provider, provider)
            )
        )
        .limit(1);

    return tokenRecord || null;
}

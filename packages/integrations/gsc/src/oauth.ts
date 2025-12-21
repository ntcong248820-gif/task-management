import { google } from 'googleapis';
import type { OAuthConfig, OAuthTokens } from './types';

/**
 * OAuth 2.0 Client Manager
 * Handles OAuth flow for Google APIs
 */
export class OAuthClient {
    private oauth2Client: any;
    private config: OAuthConfig;

    constructor(config: OAuthConfig) {
        this.config = config;
        this.oauth2Client = new google.auth.OAuth2(
            config.clientId,
            config.clientSecret,
            config.redirectUri
        );
    }

    /**
     * Generate authorization URL for OAuth flow
     * @param state - CSRF protection state
     * @returns Authorization URL
     */
    getAuthorizationUrl(state: string): string {
        return this.oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: this.config.scopes,
            state,
            prompt: 'consent', // Force consent to get refresh token
        });
    }

    /**
     * Exchange authorization code for tokens
     * @param code - Authorization code from callback
     * @returns OAuth tokens
     */
    async getTokensFromCode(code: string): Promise<OAuthTokens> {
        const { tokens } = await this.oauth2Client.getToken(code);

        return {
            accessToken: tokens.access_token!,
            refreshToken: tokens.refresh_token!,
            expiresAt: tokens.expiry_date!,
            tokenType: tokens.token_type!,
            scope: tokens.scope!,
        };
    }

    /**
     * Refresh access token using refresh token
     * @param refreshToken - Refresh token
     * @returns New OAuth tokens
     */
    async refreshAccessToken(refreshToken: string): Promise<OAuthTokens> {
        this.oauth2Client.setCredentials({
            refresh_token: refreshToken,
        });

        const { credentials } = await this.oauth2Client.refreshAccessToken();

        return {
            accessToken: credentials.access_token!,
            refreshToken: credentials.refresh_token || refreshToken,
            expiresAt: credentials.expiry_date!,
            tokenType: credentials.token_type!,
            scope: credentials.scope!,
        };
    }

    /**
     * Set credentials for API calls
     * @param tokens - OAuth tokens
     */
    setCredentials(tokens: OAuthTokens): void {
        this.oauth2Client.setCredentials({
            access_token: tokens.accessToken,
            refresh_token: tokens.refreshToken,
            expiry_date: tokens.expiresAt,
            token_type: tokens.tokenType,
            scope: tokens.scope,
        });
    }

    /**
     * Get OAuth2 client for API calls
     * @returns OAuth2 client
     */
    getClient() {
        return this.oauth2Client;
    }

    /**
     * Check if token is expired
     * @param expiresAt - Token expiry timestamp
     * @returns True if expired
     */
    static isTokenExpired(expiresAt: number): boolean {
        return Date.now() >= expiresAt - 60000; // 1 minute buffer
    }
}

/**
 * OAuth 2.0 Configuration Types
 */

export interface OAuthConfig {
    /** Google OAuth Client ID */
    clientId: string;
    /** Google OAuth Client Secret */
    clientSecret: string;
    /** OAuth redirect URI */
    redirectUri: string;
    /** OAuth scopes */
    scopes: string[];
}

export interface OAuthTokens {
    /** Access token for API calls */
    accessToken: string;
    /** Refresh token for obtaining new access tokens */
    refreshToken: string;
    /** Token expiry timestamp */
    expiresAt: number;
    /** Token type (usually 'Bearer') */
    tokenType: string;
    /** Scopes granted */
    scope: string;
}

export interface OAuthState {
    /** Random state for CSRF protection */
    state: string;
    /** Project ID associated with this OAuth flow */
    projectId: number;
    /** Timestamp when state was created */
    createdAt: number;
}

/**
 * Google Search Console Types
 */

export interface GSCSearchAnalyticsQuery {
    /** Start date (YYYY-MM-DD) */
    startDate: string;
    /** End date (YYYY-MM-DD) */
    endDate: string;
    /** Dimensions to group by */
    dimensions?: ('query' | 'page' | 'country' | 'device' | 'searchAppearance')[];
    /** Row limit */
    rowLimit?: number;
    /** Start row for pagination */
    startRow?: number;
}

export interface GSCSearchAnalyticsRow {
    /** Dimension keys */
    keys?: string[];
    /** Number of clicks */
    clicks: number;
    /** Number of impressions */
    impressions: number;
    /** Click-through rate */
    ctr: number;
    /** Average position */
    position: number;
}

export interface GSCSearchAnalyticsResponse {
    /** Result rows */
    rows: GSCSearchAnalyticsRow[];
    /** Response aggregation type */
    responseAggregationType?: string;
}

/**
 * Google Analytics 4 Types
 */

export interface GA4MetricQuery {
    /** Property ID (e.g., 'properties/123456789') */
    propertyId: string;
    /** Start date (YYYY-MM-DD) */
    startDate: string;
    /** End date (YYYY-MM-DD) */
    endDate: string;
    /** Metrics to fetch */
    metrics: string[];
    /** Dimensions to group by */
    dimensions?: string[];
    /** Row limit */
    limit?: number;
}

export interface GA4MetricValue {
    /** Metric value */
    value: string;
}

export interface GA4DimensionValue {
    /** Dimension value */
    value: string;
}

export interface GA4Row {
    /** Dimension values */
    dimensionValues: GA4DimensionValue[];
    /** Metric values */
    metricValues: GA4MetricValue[];
}

export interface GA4Response {
    /** Result rows */
    rows: GA4Row[];
    /** Row count */
    rowCount: number;
    /** Metadata */
    metadata?: {
        currencyCode?: string;
        timeZone?: string;
    };
}

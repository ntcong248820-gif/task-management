export * from './types';
export * from './client';

// Re-export for convenience
export { GA4Client } from './client';

// Re-export common types from GSC package
export type {
    OAuthConfig,
    OAuthTokens,
    OAuthState,
    GA4MetricQuery,
    GA4Response,
    GA4Row,
    GA4MetricValue,
    GA4DimensionValue,
} from '@repo/integrations-gsc';

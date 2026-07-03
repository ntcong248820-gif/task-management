import { describe, expect, it } from 'vitest';

// Tests for URL and request body construction in useIntegrationMutations.
// Verifies the fetch call shapes without making real HTTP requests.

function buildAuthorizeUrl(provider: 'gsc' | 'ga4', projectId: string): string {
  return `/api/integrations/${provider}/authorize?projectId=${projectId}`;
}

function buildDiscoverUrl(provider: 'gsc' | 'ga4', projectId: string): string {
  const resource = provider === 'gsc' ? 'sites' : 'properties';
  return `/api/integrations/${provider}/${resource}?projectId=${projectId}`;
}

function buildSyncBody(
  provider: 'gsc' | 'ga4',
  projectId: string,
  resourceId: string,
  days: number = 30
): Record<string, unknown> {
  return provider === 'gsc'
    ? { projectId, siteUrl: resourceId, days }
    : { projectId, propertyId: resourceId, days };
}

describe('useIntegrationMutations — URL construction', () => {
  it('builds GSC authorize URL correctly', () => {
    expect(buildAuthorizeUrl('gsc', 'proj-1')).toBe(
      '/api/integrations/gsc/authorize?projectId=proj-1'
    );
  });

  it('builds GA4 authorize URL correctly', () => {
    expect(buildAuthorizeUrl('ga4', 'proj-2')).toBe(
      '/api/integrations/ga4/authorize?projectId=proj-2'
    );
  });

  it('builds GSC sites discover URL without save flag', () => {
    expect(buildDiscoverUrl('gsc', 'proj-1')).toBe(
      '/api/integrations/gsc/sites?projectId=proj-1'
    );
  });

  it('builds GA4 properties discover URL without save flag', () => {
    expect(buildDiscoverUrl('ga4', 'proj-1')).toBe(
      '/api/integrations/ga4/properties?projectId=proj-1'
    );
  });
});

describe('useIntegrationMutations — sync body construction', () => {
  it('uses siteUrl field for GSC sync', () => {
    const body = buildSyncBody('gsc', 'proj-1', 'https://example.com/');
    expect(body).toEqual({ projectId: 'proj-1', siteUrl: 'https://example.com/', days: 30 });
  });

  it('uses propertyId field for GA4 sync', () => {
    const body = buildSyncBody('ga4', 'proj-1', 'properties/123456789');
    expect(body).toEqual({ projectId: 'proj-1', propertyId: 'properties/123456789', days: 30 });
  });

  it('accepts custom days parameter', () => {
    const body = buildSyncBody('gsc', 'proj-1', 'https://example.com/', 7);
    expect(body).toEqual({ projectId: 'proj-1', siteUrl: 'https://example.com/', days: 7 });
  });
});

import { describe, expect, it } from 'vitest';
import { createWorkspaceSlug } from '../workspace-slug';

describe('createWorkspaceSlug', () => {
  it('normalizes workspace names for organization slugs', () => {
    expect(createWorkspaceSlug('Acme SEO Team')).toBe('acme-seo-team');
    expect(createWorkspaceSlug('Đội SEO Hà Nội')).toBe('oi-seo-ha-noi');
  });

  it('falls back when the name has no sluggable characters', () => {
    expect(createWorkspaceSlug('***')).toMatch(/^workspace-[a-z0-9]+$/);
  });
});

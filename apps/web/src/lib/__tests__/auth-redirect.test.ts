import { describe, expect, it } from 'vitest';
import { getSafeRedirectPath } from '../auth-redirect';

describe('getSafeRedirectPath', () => {
  it('keeps same-origin paths with query strings', () => {
    expect(getSafeRedirectPath('/workspace?invitationId=abc')).toBe('/workspace?invitationId=abc');
  });

  it('rejects protocol-relative and absolute redirects', () => {
    expect(getSafeRedirectPath('//evil.example')).toBe('/workspace');
    expect(getSafeRedirectPath('https://evil.example/login')).toBe('/workspace');
  });
});

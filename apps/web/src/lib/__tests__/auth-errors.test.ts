import { describe, expect, it } from 'vitest';
import { getAuthErrorMessage } from '../auth-errors';

describe('getAuthErrorMessage', () => {
  it('uses Better Auth error messages when present', () => {
    expect(getAuthErrorMessage({ message: 'Invalid credentials' }, 'Fallback')).toBe('Invalid credentials');
  });

  it('falls back for unknown errors', () => {
    expect(getAuthErrorMessage(null, 'Unable to continue')).toBe('Unable to continue');
  });
});

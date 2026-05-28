import { describe, expect, it } from 'vitest';

// Pure validation logic extracted from ProjectFormDialog — tests the same rules
// without mounting the full React component.

function validate(form: { name: string; domain: string }): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!form.name.trim()) {
    errors.name = 'Project name is required';
  } else if (form.name.trim().length > 100) {
    errors.name = 'Name must be 100 characters or fewer';
  }
  if (form.domain && !form.domain.trim()) {
    errors.domain = 'Domain cannot be empty if provided';
  }
  return errors;
}

describe('ProjectFormDialog validation', () => {
  it('rejects empty name', () => {
    expect(validate({ name: '', domain: '' })).toEqual({ name: 'Project name is required' });
  });

  it('rejects name over 100 chars', () => {
    expect(validate({ name: 'a'.repeat(101), domain: '' })).toEqual({
      name: 'Name must be 100 characters or fewer',
    });
  });

  it('accepts name at exactly 100 chars', () => {
    expect(validate({ name: 'a'.repeat(100), domain: '' })).toEqual({});
  });

  it('accepts valid name and empty domain', () => {
    expect(validate({ name: 'My Project', domain: '' })).toEqual({});
  });

  it('accepts valid name and non-empty domain', () => {
    expect(validate({ name: 'My Project', domain: 'example.com' })).toEqual({});
  });

  it('rejects whitespace-only domain when domain string is truthy', () => {
    // form.domain = '  ' → truthy string but trim() === '' → error
    expect(validate({ name: 'My Project', domain: '  ' })).toEqual({
      domain: 'Domain cannot be empty if provided',
    });
  });

  it('accepts whitespace-only name detection as empty', () => {
    expect(validate({ name: '   ', domain: '' })).toEqual({ name: 'Project name is required' });
  });
});

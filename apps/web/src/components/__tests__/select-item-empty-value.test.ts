import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

function collectSourceFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];

  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return collectSourceFiles(path);
    return /\.(tsx|ts)$/.test(path) ? [path] : [];
  });
}

describe('Radix Select item usage', () => {
  it('does not use empty SelectItem values', () => {
    const files = collectSourceFiles(join(process.cwd(), 'src'));
    const forbiddenPattern = '<SelectItem value=' + '""';
    const offenders = files
      .filter((file) => !file.includes('__tests__'))
      .filter((file) => readFileSync(file, 'utf8').includes(forbiddenPattern));

    expect(offenders).toEqual([]);
  });
});

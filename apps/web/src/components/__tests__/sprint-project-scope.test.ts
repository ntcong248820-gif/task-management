import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('sprint project scoping', () => {
  it('scopes task detail sprint selectors to the task project', () => {
    const source = readFileSync(
      join(process.cwd(), 'src/components/features/tasks/task-detail-panel.tsx'),
      'utf8'
    );

    expect(source).toContain("useSprints({ projectId: task?.projectId, status: 'planning' })");
    expect(source).toContain("useSprints({ projectId: task?.projectId, status: 'active' })");
  });
});

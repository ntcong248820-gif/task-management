import { describe, expect, it } from 'vitest';
import { buildSprintKey } from '@/hooks/use-sprints';

describe('buildSprintKey', () => {
  it('includes projectId when filtering sprints by project', () => {
    expect(buildSprintKey({ projectId: 'project-1', status: 'active' })).toBe(
      '/api/sprints?projectId=project-1&status=active'
    );
  });

  it('keeps goalId and projectId filters together for linked sprint contexts', () => {
    expect(buildSprintKey({ goalId: 'goal-1', projectId: 'project-1' })).toBe(
      '/api/sprints?goalId=goal-1&projectId=project-1'
    );
  });
});

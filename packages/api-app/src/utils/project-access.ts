import { db, eq, and, projects, goals, sprints } from '@repo/db';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type AccessCheck =
    | { ok: true }
    | { ok: false; status: 400 | 404; error: string };

export const isUuid = (value: string) => uuidPattern.test(value);

export async function projectBelongsToWorkspace(projectId: string, workspaceId: string): Promise<boolean> {
    if (!isUuid(projectId)) return false;

    const [project] = await db
        .select({ id: projects.id })
        .from(projects)
        .where(and(eq(projects.id, projectId), eq(projects.workspaceId, workspaceId)))
        .limit(1);

    return Boolean(project);
}

export async function requireProjectInWorkspace(projectId: string, workspaceId: string): Promise<AccessCheck> {
    if (!isUuid(projectId)) {
        return { ok: false, status: 400, error: 'Invalid project ID' };
    }

    if (!(await projectBelongsToWorkspace(projectId, workspaceId))) {
        return { ok: false, status: 404, error: 'Project not found' };
    }

    return { ok: true };
}

export async function goalBelongsToWorkspace(goalId: string, workspaceId: string): Promise<boolean> {
    if (!isUuid(goalId)) return false;

    const [goal] = await db
        .select({ id: goals.id })
        .from(goals)
        .where(and(eq(goals.id, goalId), eq(goals.workspaceId, workspaceId)))
        .limit(1);

    return Boolean(goal);
}

export async function sprintBelongsToWorkspace(sprintId: string, workspaceId: string): Promise<boolean> {
    if (!isUuid(sprintId)) return false;

    const [sprint] = await db
        .select({ id: sprints.id })
        .from(sprints)
        .where(and(eq(sprints.id, sprintId), eq(sprints.workspaceId, workspaceId)))
        .limit(1);

    return Boolean(sprint);
}

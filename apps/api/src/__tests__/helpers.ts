import { db, eq, projects, tasks, timeLogs } from '@repo/db';

export const TEST_WORKSPACE_ID = 'test-workspace-id';
export const TEST_USER_ID = 'test-user-id';

/**
 * Create a test project
 */
export async function createTestProject(data?: Partial<typeof projects.$inferInsert>) {
    const [project] = await db.insert(projects).values({
        name: data?.name || 'Test Project',
        workspaceId: data?.workspaceId || TEST_WORKSPACE_ID,
        domain: data?.domain || 'https://example.com',
        description: data?.description || 'Test Description',
        ...data,
    }).returning();

    return project;
}

/**
 * Create a test task
 */
export async function createTestTask(projectId: string, data?: Partial<typeof tasks.$inferInsert>) {
    const [task] = await db.insert(tasks).values({
        title: data?.title || 'Test Task',
        status: data?.status || 'todo',
        workspaceId: data?.workspaceId || TEST_WORKSPACE_ID,
        projectId,
        reporterId: data?.reporterId || TEST_USER_ID,
        ...data,
    }).returning();

    return task;
}

/**
 * Create a test time log
 */
export async function createTestTimeLog(taskId: string, data?: Partial<typeof timeLogs.$inferInsert>) {
    const [timeLog] = await db.insert(timeLogs).values({
        taskId,
        workspaceId: data?.workspaceId || TEST_WORKSPACE_ID,
        userId: data?.userId || TEST_USER_ID,
        startedAt: data?.startedAt || new Date(),
        endedAt: data?.endedAt,
        duration: data?.duration || 0,
        ...data,
    }).returning();

    return timeLog;
}

/**
 * Clean up all test data
 * Deletes in correct order to respect foreign key constraints
 */
export async function cleanupTestData() {
    try {
        // Delete only test-owned rows. Never clear whole business tables.
        await db.delete(timeLogs).where(eq(timeLogs.workspaceId, TEST_WORKSPACE_ID));
        await db.delete(tasks).where(eq(tasks.workspaceId, TEST_WORKSPACE_ID));
        await db.delete(projects).where(eq(projects.workspaceId, TEST_WORKSPACE_ID));
    } catch (error) {
        console.error('Error cleaning up test data:', error);
        // If cascade delete fails, try truncating (for test environment only)
        // This should only be used in test database
    }
}

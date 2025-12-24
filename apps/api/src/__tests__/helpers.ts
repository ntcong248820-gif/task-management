import { db } from '@repo/db';
import { projects, tasks, timeLogs } from '@repo/db/schema';
import { eq, sql } from 'drizzle-orm';

/**
 * Create a test project
 */
export async function createTestProject(data?: Partial<typeof projects.$inferInsert>) {
    const [project] = await db.insert(projects).values({
        name: data?.name || 'Test Project',
        description: data?.description || 'Test Description',
        ...data,
    }).returning();

    return project;
}

/**
 * Create a test task
 */
export async function createTestTask(projectId: number, data?: Partial<typeof tasks.$inferInsert>) {
    const [task] = await db.insert(tasks).values({
        title: data?.title || 'Test Task',
        status: data?.status || 'todo',
        projectId,
        ...data,
    }).returning();

    return task;
}

/**
 * Create a test time log
 */
export async function createTestTimeLog(taskId: number, data?: Partial<typeof timeLogs.$inferInsert>) {
    const [timeLog] = await db.insert(timeLogs).values({
        taskId,
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
        // Delete in reverse order of dependencies
        await db.delete(timeLogs);
        await db.delete(tasks);
        await db.delete(projects);
    } catch (error) {
        console.error('Error cleaning up test data:', error);
        // If cascade delete fails, try truncating (for test environment only)
        // This should only be used in test database
    }
}

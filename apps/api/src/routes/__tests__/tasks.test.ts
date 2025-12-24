import { describe, it, expect, beforeEach } from 'vitest';
import { createTestProject, createTestTask, cleanupTestData } from '../../__tests__/helpers';

describe('Tasks API', () => {
    let testProjectId: number;

    beforeEach(async () => {
        await cleanupTestData();
        const project = await createTestProject();
        testProjectId = project.id;
    });

    describe('Database Operations', () => {
        it('should create a new task', async () => {
            const task = await createTestTask(testProjectId, {
                title: 'Test Task 1',
                description: 'Test Description 1',
                status: 'todo',
            });

            expect(task).toBeDefined();
            expect(task.title).toBe('Test Task 1');
            expect(task.description).toBe('Test Description 1');
            expect(task.status).toBe('todo');
            expect(task.projectId).toBe(testProjectId);
        });

        it('should create task with default values', async () => {
            const task = await createTestTask(testProjectId);

            expect(task.title).toBe('Test Task');
            expect(task.status).toBe('todo');
            expect(task.projectId).toBe(testProjectId);
        });

        it('should create tasks with different statuses', async () => {
            const todoTask = await createTestTask(testProjectId, { status: 'todo' });
            const inProgressTask = await createTestTask(testProjectId, { status: 'in-progress' });
            const doneTask = await createTestTask(testProjectId, { status: 'done' });

            expect(todoTask.status).toBe('todo');
            expect(inProgressTask.status).toBe('in-progress');
            expect(doneTask.status).toBe('done');
        });

        it('should create multiple tasks for same project', async () => {
            const task1 = await createTestTask(testProjectId, { title: 'Task 1' });
            const task2 = await createTestTask(testProjectId, { title: 'Task 2' });

            expect(task1.id).not.toBe(task2.id);
            expect(task1.projectId).toBe(testProjectId);
            expect(task2.projectId).toBe(testProjectId);
        });
    });
});

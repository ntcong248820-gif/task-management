import { describe, it, expect, beforeEach } from 'vitest';
import { createTestProject, cleanupTestData } from '../../__tests__/helpers';

describe('Projects API', () => {
    beforeEach(async () => {
        await cleanupTestData();
    });

    describe('Database Operations', () => {
        it('should create a new project', async () => {
            const project = await createTestProject({
                name: 'Test Project 1',
                description: 'Test Description 1',
            });

            expect(project).toBeDefined();
            expect(project.name).toBe('Test Project 1');
            expect(project.description).toBe('Test Description 1');
            expect(project.id).toBeTypeOf('number');
        });

        it('should create project with default values', async () => {
            const project = await createTestProject();

            expect(project.name).toBe('Test Project');
            expect(project.description).toBe('Test Description');
        });

        it('should create multiple projects', async () => {
            const project1 = await createTestProject({ name: 'Project 1' });
            const project2 = await createTestProject({ name: 'Project 2' });

            expect(project1.id).not.toBe(project2.id);
            expect(project1.name).toBe('Project 1');
            expect(project2.name).toBe('Project 2');
        });
    });
});

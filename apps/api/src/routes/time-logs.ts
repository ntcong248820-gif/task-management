import { Hono } from 'hono';
import { db, timeLogs, eq, desc } from '@repo/db';
import { logger } from '../utils/logger';

const log = logger.child('TimeLogs');

const app = new Hono();

// GET /api/time-logs?taskId=X - Get time logs for a task
app.get('/', async (c) => {
    try {
        const taskId = c.req.query('taskId');

        if (taskId) {
            const logs = await db
                .select()
                .from(timeLogs)
                .where(eq(timeLogs.taskId, Number(taskId)))
                .orderBy(desc(timeLogs.startTime));

            return c.json({
                success: true,
                data: logs,
                count: logs.length,
            });
        }

        // Get all time logs if no taskId specified
        const logs = await db
            .select()
            .from(timeLogs)
            .orderBy(desc(timeLogs.startTime));

        return c.json({
            success: true,
            data: logs,
            count: logs.length,
        });
    } catch (error) {
        log.error('Error fetching time logs', error);
        return c.json(
            {
                success: false,
                error: 'Failed to fetch time logs',
            },
            500
        );
    }
});

// POST /api/time-logs - Create a new time log
app.post('/', async (c) => {
    try {
        const body = await c.req.json();
        const { taskId, startTime, endTime, duration } = body;

        // Validation
        if (!taskId || !startTime || !endTime || !duration) {
            return c.json(
                {
                    success: false,
                    error: 'Missing required fields: taskId, startTime, endTime, duration',
                },
                400
            );
        }

        // Insert time log
        const [newLog] = await db
            .insert(timeLogs)
            .values({
                taskId: Number(taskId),
                startTime: new Date(startTime),
                endTime: new Date(endTime),
                duration: Number(duration),
            })
            .returning();

        return c.json({
            success: true,
            data: newLog,
            message: 'Time log created successfully',
        });
    } catch (error) {
        log.error('Error creating time log', error);
        return c.json(
            {
                success: false,
                error: 'Failed to create time log',
            },
            500
        );
    }
});

// DELETE /api/time-logs/:id - Delete a time log
app.delete('/:id', async (c) => {
    try {
        const id = c.req.param('id');

        const [deletedLog] = await db
            .delete(timeLogs)
            .where(eq(timeLogs.id, Number(id)))
            .returning();

        if (!deletedLog) {
            return c.json(
                {
                    success: false,
                    error: 'Time log not found',
                },
                404
            );
        }

        return c.json({
            success: true,
            data: deletedLog,
            message: 'Time log deleted successfully',
        });
    } catch (error) {
        log.error('Error deleting time log', error);
        return c.json(
            {
                success: false,
                error: 'Failed to delete time log',
            },
            500
        );
    }
});

export default app;

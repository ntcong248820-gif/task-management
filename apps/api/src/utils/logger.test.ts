import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Logger } from './logger';

describe('Logger', () => {
    let consoleSpy: {
        log: ReturnType<typeof vi.spyOn>;
        warn: ReturnType<typeof vi.spyOn>;
        error: ReturnType<typeof vi.spyOn>;
    };
    let testLogger: Logger;

    beforeEach(() => {
        consoleSpy = {
            log: vi.spyOn(console, 'log').mockImplementation(() => { }),
            warn: vi.spyOn(console, 'warn').mockImplementation(() => { }),
            error: vi.spyOn(console, 'error').mockImplementation(() => { }),
        };
        // Create logger with enabled:true for testing
        testLogger = new Logger({ context: 'Test', enabled: true });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('log levels', () => {
        it('should log info messages', () => {
            testLogger.info('Test info message');
            expect(consoleSpy.log).toHaveBeenCalled();
            expect(consoleSpy.log.mock.calls[0][0]).toContain('INFO');
            expect(consoleSpy.log.mock.calls[0][0]).toContain('Test info message');
        });

        it('should log debug messages', () => {
            testLogger.debug('Test debug message');
            expect(consoleSpy.log).toHaveBeenCalled();
            expect(consoleSpy.log.mock.calls[0][0]).toContain('DEBUG');
        });

        it('should log warn messages', () => {
            testLogger.warn('Test warn message');
            expect(consoleSpy.warn).toHaveBeenCalled();
            expect(consoleSpy.warn.mock.calls[0][0]).toContain('WARN');
        });

        it('should log error messages', () => {
            testLogger.error('Test error message');
            expect(consoleSpy.error).toHaveBeenCalled();
            expect(consoleSpy.error.mock.calls[0][0]).toContain('ERROR');
        });

        it('should log error with Error object', () => {
            const error = new Error('Something went wrong');
            testLogger.error('Test error', error);
            expect(consoleSpy.error).toHaveBeenCalledTimes(2);
            expect(consoleSpy.error.mock.calls[1][0]).toContain('Something went wrong');
        });
    });

    describe('child logger', () => {
        it('should create child logger with context', () => {
            const childLog = testLogger.child('Module');
            childLog.info('Child message');
            expect(consoleSpy.log).toHaveBeenCalled();
            expect(consoleSpy.log.mock.calls[0][0]).toContain('[Test:Module]');
        });

        it('should chain child contexts', () => {
            const childLog = testLogger.child('Module').child('Submodule');
            childLog.info('Nested message');
            expect(consoleSpy.log.mock.calls[0][0]).toContain('[Test:Module:Submodule]');
        });
    });

    describe('Logger class configuration', () => {
        it('should create logger with custom context', () => {
            const customLogger = new Logger({ context: 'CustomApp', enabled: true });
            customLogger.info('Custom message');
            expect(consoleSpy.log.mock.calls[0][0]).toContain('[CustomApp]');
        });

        it('should respect enabled flag', () => {
            const disabledLogger = new Logger({ enabled: false });
            disabledLogger.info('Should not log');
            expect(consoleSpy.log).not.toHaveBeenCalled();
        });

        it('should include timestamp in output', () => {
            testLogger.info('Timestamp test');
            const output = consoleSpy.log.mock.calls[0][0];
            // Check for ISO date format pattern
            expect(output).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
        });

        it('should handle meta data logging', () => {
            testLogger.info('With meta', { key: 'value' });
            expect(consoleSpy.log).toHaveBeenCalledTimes(2);
            expect(consoleSpy.log.mock.calls[1][0]).toEqual({ key: 'value' });
        });
    });
});

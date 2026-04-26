/**
 * Logger Utility
 * 
 * A structured logger for the API with support for log levels,
 * context, and environment-based output control.
 * 
 * Usage:
 *   import { logger } from '@/utils/logger';
 *   logger.info('Message');
 *   logger.error('Error message', error);
 *   logger.child('GSC').info('Contextual log');
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerOptions {
    context?: string;
    enabled?: boolean;
}

const LOG_LEVELS: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
};

const LEVEL_COLORS: Record<LogLevel, string> = {
    debug: '\x1b[36m', // cyan
    info: '\x1b[32m',  // green
    warn: '\x1b[33m',  // yellow
    error: '\x1b[31m', // red
};

const RESET_COLOR = '\x1b[0m';

class Logger {
    private context: string;
    private enabled: boolean;
    private minLevel: LogLevel;

    constructor(options: LoggerOptions = {}) {
        this.context = options.context || 'API';
        this.enabled = options.enabled ?? process.env.NODE_ENV !== 'test';
        this.minLevel = (process.env.LOG_LEVEL as LogLevel) || 'debug';
    }

    private shouldLog(level: LogLevel): boolean {
        if (!this.enabled) return false;
        return LOG_LEVELS[level] >= LOG_LEVELS[this.minLevel];
    }

    private formatMessage(level: LogLevel, message: string, _meta?: any): string {
        const timestamp = new Date().toISOString();
        const color = LEVEL_COLORS[level];
        const levelStr = level.toUpperCase().padEnd(5);
        const contextStr = this.context ? `[${this.context}]` : '';

        let output = `${color}${timestamp} ${levelStr}${RESET_COLOR} ${contextStr} ${message}`;

        return output;
    }

    debug(message: string, meta?: any): void {
        if (this.shouldLog('debug')) {
            console.log(this.formatMessage('debug', message, meta));
            if (meta) console.log(meta);
        }
    }

    info(message: string, meta?: any): void {
        if (this.shouldLog('info')) {
            console.log(this.formatMessage('info', message, meta));
            if (meta) console.log(meta);
        }
    }

    warn(message: string, meta?: any): void {
        if (this.shouldLog('warn')) {
            console.warn(this.formatMessage('warn', message, meta));
            if (meta) console.warn(meta);
        }
    }

    error(message: string, error?: Error | unknown): void {
        if (this.shouldLog('error')) {
            console.error(this.formatMessage('error', message));
            if (error) {
                if (error instanceof Error) {
                    console.error(`  → ${error.message}`);
                    if (process.env.NODE_ENV === 'development' && error.stack) {
                        console.error(error.stack);
                    }
                } else {
                    console.error(error);
                }
            }
        }
    }

    /**
     * Create a child logger with a specific context
     * @param context - The context name for the child logger
     */
    child(context: string): Logger {
        return new Logger({
            context: this.context ? `${this.context}:${context}` : context,
            enabled: this.enabled,
        });
    }
}

// Export singleton instance
export const logger = new Logger();

// Export class for creating custom loggers
export { Logger };

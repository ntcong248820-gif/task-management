/**
 * Application configuration
 * Centralized config for environment variables
 */

export const config = {
    /**
     * API base URL
     * @default 'http://localhost:3001' in development
     */
    // Empty string = same-origin (production). Dev sets NEXT_PUBLIC_API_URL=http://localhost:3001 in .env.local
    apiUrl: process.env.NEXT_PUBLIC_API_URL || '',
} as const

/**
 * Get full API endpoint URL
 * @param path - API path (e.g., '/api/tasks')
 * @returns Full URL
 */
export function getApiUrl(path: string): string {
    const baseUrl = config.apiUrl.endsWith('/') ? config.apiUrl.slice(0, -1) : config.apiUrl;
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${baseUrl}${normalizedPath}`;
}

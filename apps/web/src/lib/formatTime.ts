/**
 * Format seconds to HH:MM:SS format
 * @param seconds - Total seconds
 * @returns Formatted time string (e.g., "01:23:45")
 */
export function formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    return [hours, minutes, secs]
        .map((val) => val.toString().padStart(2, '0'))
        .join(':');
}

/**
 * Parse HH:MM:SS format to seconds
 * @param timeString - Time string in HH:MM:SS format
 * @returns Total seconds
 */
export function parseTime(timeString: string): number {
    const parts = timeString.split(':').map(Number);
    if (parts.length !== 3) return 0;

    const [hours, minutes, seconds] = parts;
    return hours * 3600 + minutes * 60 + seconds;
}

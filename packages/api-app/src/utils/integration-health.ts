export type IntegrationHealthState = 'healthy' | 'stale' | 'needs_reconnect' | 'error' | 'syncing';

const STALE_THRESHOLD_MS = 36 * 60 * 60 * 1000;
const STUCK_SYNCING_THRESHOLD_MS = 15 * 60 * 1000;

export interface ConnectionHealthInput {
    syncStatus: string;
    syncError: string | null;
    lastSyncedAt: Date | null;
    lastAttemptedAt?: Date | null;
}

export function isInvalidGrantError(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error ?? '');
    return message.includes('invalid_grant');
}

export function deriveHealthState(input: ConnectionHealthInput): IntegrationHealthState {
    if (input.syncStatus === 'syncing') {
        const attemptAge = input.lastAttemptedAt ? Date.now() - input.lastAttemptedAt.getTime() : 0;
        if (attemptAge <= STUCK_SYNCING_THRESHOLD_MS) {
            return 'syncing';
        }
        return 'error';
    }

    if (input.syncStatus === 'error') {
        if (input.syncError && isInvalidGrantError(new Error(input.syncError))) {
            return 'needs_reconnect';
        }
        return 'error';
    }

    if (!input.lastSyncedAt) {
        return 'stale';
    }

    const age = Date.now() - input.lastSyncedAt.getTime();
    return age > STALE_THRESHOLD_MS ? 'stale' : 'healthy';
}

import { describe, it, expect } from 'vitest';
import {
    deriveHealthState,
    isInvalidGrantError,
} from '../../../../../packages/api-app/src/utils/integration-health';

describe('isInvalidGrantError', () => {
    it('detects invalid_grant in an Error message', () => {
        expect(isInvalidGrantError(new Error('invalid_grant: token revoked'))).toBe(true);
    });

    it('returns false for unrelated errors', () => {
        expect(isInvalidGrantError(new Error('network timeout'))).toBe(false);
    });

    it('handles non-Error values without throwing', () => {
        expect(isInvalidGrantError('invalid_grant')).toBe(true);
        expect(isInvalidGrantError(null)).toBe(false);
        expect(isInvalidGrantError(undefined)).toBe(false);
    });
});

describe('deriveHealthState', () => {
    it('returns syncing when syncStatus is syncing and attempt is recent', () => {
        expect(
            deriveHealthState({
                syncStatus: 'syncing',
                syncError: null,
                lastSyncedAt: null,
                lastAttemptedAt: new Date(),
            })
        ).toBe('syncing');
    });

    it('returns syncing when syncStatus is syncing with no lastAttemptedAt (treated as fresh)', () => {
        expect(
            deriveHealthState({ syncStatus: 'syncing', syncError: null, lastSyncedAt: null })
        ).toBe('syncing');
    });

    it('returns error when syncStatus is syncing but stuck past the timeout threshold', () => {
        const stuckAttempt = new Date(Date.now() - 20 * 60 * 1000); // 20 min ago
        expect(
            deriveHealthState({
                syncStatus: 'syncing',
                syncError: null,
                lastSyncedAt: null,
                lastAttemptedAt: stuckAttempt,
            })
        ).toBe('error');
    });

    it('returns needs_reconnect when syncStatus is error with an invalid_grant message', () => {
        expect(
            deriveHealthState({
                syncStatus: 'error',
                syncError: 'invalid_grant: Google authorization revoked or expired',
                lastSyncedAt: new Date(),
            })
        ).toBe('needs_reconnect');
    });

    it('returns error when syncStatus is error with a non-invalid_grant message', () => {
        expect(
            deriveHealthState({
                syncStatus: 'error',
                syncError: 'GA4 API quota exceeded',
                lastSyncedAt: new Date(),
            })
        ).toBe('error');
    });

    it('returns stale when never synced', () => {
        expect(
            deriveHealthState({ syncStatus: 'idle', syncError: null, lastSyncedAt: null })
        ).toBe('stale');
    });

    it('returns healthy when last sync is within the freshness window', () => {
        const recent = new Date(Date.now() - 60 * 60 * 1000); // 1h ago
        expect(
            deriveHealthState({ syncStatus: 'idle', syncError: null, lastSyncedAt: recent })
        ).toBe('healthy');
    });

    it('returns stale when last sync is older than the freshness window', () => {
        const old = new Date(Date.now() - 48 * 60 * 60 * 1000); // 48h ago
        expect(
            deriveHealthState({ syncStatus: 'idle', syncError: null, lastSyncedAt: old })
        ).toBe('stale');
    });
});

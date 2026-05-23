import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { encryptToken, decryptToken, isEncrypted, decryptTokenValue } from '../crypto-tokens';

const TEST_KEY = 'a'.repeat(64); // valid 32-byte hex key

beforeEach(() => {
    process.env.ENCRYPTION_KEY = TEST_KEY;
});

afterEach(() => {
    delete process.env.ENCRYPTION_KEY;
});

describe('encryptToken / decryptToken', () => {
    it('round-trips a token correctly', () => {
        const plaintext = 'ya29.some_google_access_token';
        const encrypted = encryptToken(plaintext);
        expect(decryptToken(encrypted)).toBe(plaintext);
    });

    it('produces iv:tag:ciphertext format', () => {
        const encrypted = encryptToken('token');
        const parts = encrypted.split(':');
        expect(parts).toHaveLength(3);
        expect(parts[0]).toHaveLength(24); // 12-byte IV → 24 hex chars
        expect(parts[1]).toHaveLength(32); // 16-byte auth tag → 32 hex chars
    });

    it('produces different ciphertext for same plaintext (random IV)', () => {
        const token = 'same_token';
        expect(encryptToken(token)).not.toBe(encryptToken(token));
    });

    it('throws when ENCRYPTION_KEY is missing', () => {
        delete process.env.ENCRYPTION_KEY;
        expect(() => encryptToken('test')).toThrow('ENCRYPTION_KEY');
    });

    it('throws on tampered ciphertext (auth tag mismatch)', () => {
        const encrypted = encryptToken('token');
        const parts = encrypted.split(':');
        // Corrupt one byte of the ciphertext
        parts[2] = parts[2].slice(0, -2) + '00';
        expect(() => decryptToken(parts.join(':'))).toThrow();
    });
});

describe('isEncrypted', () => {
    it('returns true for encrypted format', () => {
        expect(isEncrypted(encryptToken('token'))).toBe(true);
    });

    it('returns false for plaintext Google tokens', () => {
        expect(isEncrypted('ya29.some_access_token')).toBe(false);
        // Refresh tokens (no colons in base64url)
        expect(isEncrypted('1//04somerefreshtoken')).toBe(false);
    });

    it('returns false for 3-segment strings with wrong segment lengths', () => {
        // 4-segment string with wrong IV/tag lengths should not match
        expect(isEncrypted('short:short:data')).toBe(false);
    });
});

describe('decryptTokenValue', () => {
    it('decrypts an encrypted value', () => {
        const encrypted = encryptToken('my_token');
        expect(decryptTokenValue(encrypted)).toBe('my_token');
    });

    it('passes through unencrypted values unchanged (backward-compat)', () => {
        const plaintext = 'ya29.plaintext_token';
        expect(decryptTokenValue(plaintext)).toBe(plaintext);
    });
});

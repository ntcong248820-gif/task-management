import crypto from 'crypto';

const ALGO = 'aes-256-gcm';

function getKey(): Buffer {
    const hex = process.env.ENCRYPTION_KEY;
    if (!hex) throw new Error('ENCRYPTION_KEY env var is required');
    const key = Buffer.from(hex, 'hex');
    if (key.length !== 32) throw new Error('ENCRYPTION_KEY must be 64 hex chars (32 bytes)');
    return key;
}

export function encryptToken(plaintext: string): string {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(ALGO, getKey(), iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decryptToken(encrypted: string): string {
    const [ivHex, tagHex, ciphertextHex] = encrypted.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    const ciphertext = Buffer.from(ciphertextHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGO, getKey(), iv);
    decipher.setAuthTag(tag);
    return decipher.update(ciphertext).toString('utf8') + decipher.final('utf8');
}

export function isEncrypted(value: string): boolean {
    const parts = value.split(':');
    return parts.length === 3
        && parts[0].length === 24  // 12-byte IV → 24 hex chars
        && parts[1].length === 32; // 16-byte auth tag → 32 hex chars
}

// Decrypt if encrypted, pass through if plaintext (backward-compat for unencrypted rows)
export function decryptTokenValue(value: string): string {
    return isEncrypted(value) ? decryptToken(value) : value;
}

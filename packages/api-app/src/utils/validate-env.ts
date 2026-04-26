const REQUIRED = [
    'DATABASE_URL',
    'ENCRYPTION_KEY',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
] as const;

const REQUIRED_PROD = ['CRON_SECRET', 'FRONTEND_URL'] as const;

const REQUIRED_OAUTH = [
    'GOOGLE_GSC_REDIRECT_URI',
    'GOOGLE_GA4_REDIRECT_URI',
] as const;

export function validateEnv(): void {
    if (process.env.NODE_ENV === 'test') return;

    const missing: string[] = [];
    for (const k of REQUIRED) {
        if (!process.env[k]) missing.push(k);
    }

    if (process.env.NODE_ENV === 'production') {
        for (const k of REQUIRED_PROD) {
            if (!process.env[k]) missing.push(k);
        }
    }

    if (missing.length) {
        throw new Error(`Missing required env vars: ${missing.join(', ')}`);
    }

    // ENCRYPTION_KEY must be exactly 64 valid hex chars (32 bytes for AES-256)
    if (!/^[0-9a-fA-F]{64}$/.test(process.env.ENCRYPTION_KEY!)) {
        throw new Error('ENCRYPTION_KEY must be 64-char hex string (openssl rand -hex 32)');
    }

    for (const k of REQUIRED_OAUTH) {
        if (!process.env[k]) {
            console.warn(`[env] OAuth disabled: ${k} not set`);
        }
    }
}

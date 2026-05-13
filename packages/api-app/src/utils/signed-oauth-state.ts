import crypto from 'crypto';

type IntegrationId = 'gsc' | 'ga4';

interface OAuthStatePayload {
    integration: IntegrationId;
    projectId: number;
    userId: string;
    workspaceId: string;
    nonce: string;
    expiresAt: number;
}

interface SignedOAuthState {
    payload: OAuthStatePayload;
    signature: string;
}

const STATE_TTL_MS = 10 * 60 * 1000;

function getStateSecret(): string {
    const secret = process.env.BETTER_AUTH_SECRET || process.env.ENCRYPTION_KEY;
    if (!secret) {
        throw new Error('BETTER_AUTH_SECRET or ENCRYPTION_KEY is required for OAuth state signing');
    }
    return secret;
}

function serializePayload(payload: OAuthStatePayload): string {
    return [
        payload.integration,
        payload.projectId,
        payload.userId,
        payload.workspaceId,
        payload.nonce,
        payload.expiresAt,
    ].join('|');
}

function signPayload(payload: OAuthStatePayload): string {
    return crypto
        .createHmac('sha256', getStateSecret())
        .update(serializePayload(payload))
        .digest('base64url');
}

export function createSignedOAuthState(input: Omit<OAuthStatePayload, 'nonce' | 'expiresAt'>): string {
    const payload: OAuthStatePayload = {
        ...input,
        nonce: crypto.randomBytes(16).toString('hex'),
        expiresAt: Date.now() + STATE_TTL_MS,
    };

    const state: SignedOAuthState = {
        payload,
        signature: signPayload(payload),
    };

    return Buffer.from(JSON.stringify(state)).toString('base64url');
}

export function verifySignedOAuthState(stateValue: string, integration: IntegrationId): OAuthStatePayload {
    const decoded = JSON.parse(Buffer.from(stateValue, 'base64url').toString()) as SignedOAuthState;
    const { payload, signature } = decoded;

    if (!payload || !signature || payload.integration !== integration) {
        throw new Error('Invalid OAuth state payload');
    }

    if (!payload.projectId || !payload.userId || !payload.workspaceId || !payload.nonce || !payload.expiresAt) {
        throw new Error('Incomplete OAuth state payload');
    }

    if (payload.expiresAt < Date.now()) {
        throw new Error('Expired OAuth state');
    }

    const expectedSignature = signPayload(payload);
    const signatureBuffer = Buffer.from(signature);
    const expectedSignatureBuffer = Buffer.from(expectedSignature);
    const isValid = signatureBuffer.length === expectedSignatureBuffer.length
        && crypto.timingSafeEqual(signatureBuffer, expectedSignatureBuffer);

    if (!isValid) {
        throw new Error('Invalid OAuth state signature');
    }

    return payload;
}

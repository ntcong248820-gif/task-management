/**
 * One-time migration: encrypt all existing plaintext OAuth tokens at rest.
 * Run once after deploying the crypto-tokens changes.
 * Safe to re-run — skips rows already encrypted via isEncrypted check.
 *
 * Usage: ENCRYPTION_KEY=<64-char-hex> tsx scripts/migrate-encrypt-tokens.ts
 */
import 'dotenv/config';
import { db, oauthTokens, eq } from '@repo/db';
import { encryptToken, isEncrypted } from '../apps/api/src/utils/crypto-tokens';

async function main() {
    console.log('[migrate-encrypt-tokens] Starting...');

    const rows = await db.select().from(oauthTokens);
    console.log(`[migrate-encrypt-tokens] Found ${rows.length} token row(s)`);

    let updated = 0;
    let skipped = 0;

    for (const row of rows) {
        const alreadyEncrypted =
            isEncrypted(row.accessToken) && isEncrypted(row.refreshToken);

        if (alreadyEncrypted) {
            skipped++;
            continue;
        }

        await db
            .update(oauthTokens)
            .set({
                accessToken: isEncrypted(row.accessToken)
                    ? row.accessToken
                    : encryptToken(row.accessToken),
                refreshToken: isEncrypted(row.refreshToken)
                    ? row.refreshToken
                    : encryptToken(row.refreshToken),
                updatedAt: new Date(),
            })
            .where(eq(oauthTokens.id, row.id));

        updated++;
        console.log(`[migrate-encrypt-tokens] Encrypted row id=${row.id} (provider=${row.provider})`);
    }

    console.log(`[migrate-encrypt-tokens] Done. Updated=${updated}, Skipped=${skipped}`);
    process.exit(0);
}

main().catch((err) => {
    console.error('[migrate-encrypt-tokens] FAILED:', err);
    process.exit(1);
});

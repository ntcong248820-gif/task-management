import 'dotenv/config'; // Load .env
import path from 'path';
import dotenv from 'dotenv';
import fs from 'fs';

// Force load apps/api/.env
const apiEnvPath = path.resolve(__dirname, '../../.env');
console.log('Loading env from:', apiEnvPath);

if (fs.existsSync(apiEnvPath)) {
    const envConfig = dotenv.parse(fs.readFileSync(apiEnvPath));
    for (const k in envConfig) {
        process.env[k] = envConfig[k];
    }
}

console.log('Environment Debug:', {
    hasClientId: !!process.env.GOOGLE_CLIENT_ID,
    clientIdPrefix: process.env.GOOGLE_CLIENT_ID?.substring(0, 15)
});

import { runGSCSync } from '../jobs/sync-gsc';
import { runGA4Sync } from '../jobs/sync-ga4';

async function main() {
    console.log('🚀 Starting manual sync test...');

    console.log('\n--- Syncing GSC ---');
    await runGSCSync();

    console.log('\n--- Syncing GA4 ---');
    await runGA4Sync();

    console.log('\n✅ Manual sync test complete.');
    process.exit(0);
}

main().catch(err => {
    console.error('❌ Sync failed:', err);
    process.exit(1);
});

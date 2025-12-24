import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

const webEnvPath = path.resolve(__dirname, '../../../../apps/web/.env.local');

if (fs.existsSync(webEnvPath)) {
    const envConfig = dotenv.parse(fs.readFileSync(webEnvPath));
    const clientId = envConfig.GOOGLE_CLIENT_ID;
    const clientSecret = envConfig.GOOGLE_CLIENT_SECRET;

    console.log('Found apps/web/.env.local');
    console.log('GOOGLE_CLIENT_ID:', clientId ? clientId.substring(0, 20) + '...' : 'MISSING');
    console.log('GOOGLE_CLIENT_SECRET:', clientSecret ? (clientSecret.substring(0, 5) + '...') : 'MISSING');

    // Check if they are valid (not the placeholder)
    if (clientId && !clientId.startsWith('your-client-id') && !clientId.startsWith('YOUR_')) {
        console.log('VALID_CREDS_FOUND: YES');
    } else {
        console.log('VALID_CREDS_FOUND: NO');
    }
} else {
    console.log('apps/web/.env.local NOT FOUND');
}

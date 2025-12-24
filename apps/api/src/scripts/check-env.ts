import fs from 'fs';
import path from 'path';

const apiEnvPath = path.resolve(__dirname, '../../../../apps/api/.env');

if (fs.existsSync(apiEnvPath)) {
    const content = fs.readFileSync(apiEnvPath, 'utf-8');
    const clientIdMatch = content.match(/GOOGLE_CLIENT_ID=(.*)/);

    if (clientIdMatch) {
        console.log('Current apps/api/.env Client ID:', clientIdMatch[1].substring(0, 25));
    } else {
        console.log('GOOGLE_CLIENT_ID not found in apps/api/.env');
    }
} else {
    console.log('apps/api/.env NOT FOUND');
}

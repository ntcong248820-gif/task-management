import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

const webEnvPath = path.resolve(__dirname, '../../../../apps/web/.env.local');
const apiEnvPath = path.resolve(__dirname, '../../../../apps/api/.env');

if (fs.existsSync(webEnvPath)) {
    const webConfig = dotenv.parse(fs.readFileSync(webEnvPath));
    const clientId = webConfig.GOOGLE_CLIENT_ID;
    const clientSecret = webConfig.GOOGLE_CLIENT_SECRET;

    // Read existing API env or create empty
    let apiEnvContent = '';
    if (fs.existsSync(apiEnvPath)) {
        apiEnvContent = fs.readFileSync(apiEnvPath, 'utf-8');
    }

    // Function to update or append a key
    const updateKey = (content: string, key: string, value: string) => {
        const regex = new RegExp(`^${key}=.*$`, 'm');
        if (regex.test(content)) {
            return content.replace(regex, `${key}=${value}`);
        } else {
            return content + `\n${key}=${value}`;
        }
    };

    if (clientId && clientSecret) {
        apiEnvContent = updateKey(apiEnvContent, 'GOOGLE_CLIENT_ID', clientId);
        apiEnvContent = updateKey(apiEnvContent, 'GOOGLE_CLIENT_SECRET', clientSecret);
        // Also ensure Redirect URI is correct for API if needed, but usually it's hardcoded or env dependent
        // For cron jobs, redirect URI might not be strictly needed unless generating auth urls, 
        // but let's keep it consistent if it exists in webEnv
        if (webConfig.GOOGLE_REDIRECT_URI) {
            apiEnvContent = updateKey(apiEnvContent, 'GOOGLE_REDIRECT_URI', webConfig.GOOGLE_REDIRECT_URI);
        }

        fs.writeFileSync(apiEnvPath, apiEnvContent);
        console.log('✅ Successfully updated apps/api/.env with credentials from apps/web/.env.local');
    } else {
        console.error('❌ Could not find GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET in web env');
    }

} else {
    console.error('❌ apps/web/.env.local not found');
}

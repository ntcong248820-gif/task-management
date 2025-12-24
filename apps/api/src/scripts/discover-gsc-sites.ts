import { db, oauthTokens, gscSites, eq } from '@repo/db';
import { google } from 'googleapis';
import { getValidAccessToken } from '../utils/token-refresh';

/**
 * Discover and save GSC sites for a project
 */
async function discoverSites(projectId: number) {
    console.log(`\n🔍 Discovering GSC sites for project ${projectId}...\n`);

    try {
        // Get OAuth token
        const [tokenRecord] = await db
            .select()
            .from(oauthTokens)
            .where(eq(oauthTokens.projectId, projectId))
            .limit(1);

        if (!tokenRecord) {
            console.error(`❌ No OAuth token found for project ${projectId}`);
            return;
        }

        // Get valid access token
        const validAccessToken = await getValidAccessToken(tokenRecord);

        // Initialize GSC client
        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID!,
            process.env.GOOGLE_CLIENT_SECRET!,
            process.env.GOOGLE_REDIRECT_URI!
        );
        oauth2Client.setCredentials({
            access_token: validAccessToken,
            refresh_token: tokenRecord.refreshToken,
        });

        const searchconsole = google.searchconsole({ version: 'v1', auth: oauth2Client });

        // List sites
        const response = await searchconsole.sites.list();
        const sites = response.data.siteEntry || [];

        if (sites.length === 0) {
            console.log(`⚠️ No sites found in GSC account`);
            return;
        }

        console.log(`✅ Found ${sites.length} site(s):\n`);

        // Insert sites into database
        for (const site of sites) {
            const siteUrl = site.siteUrl;
            if (!siteUrl) continue;

            console.log(`   📍 ${siteUrl}`);

            await db
                .insert(gscSites)
                .values({
                    projectId,
                    siteUrl,
                })
                .onConflictDoNothing();
        }

        console.log(`\n✅ Sites saved to database!`);

    } catch (error: any) {
        console.error(`\n❌ Error:`, error.message);
        if (error.stack) console.error(error.stack);
    }
}

// Run
const projectId = parseInt(process.argv[2] || '27');
discoverSites(projectId).then(() => process.exit(0));

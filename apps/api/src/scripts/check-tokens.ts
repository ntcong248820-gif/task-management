import { db } from '../../../../packages/db/src/index';
import { oauthTokens } from '../../../../packages/db/src/schema';

async function checkTokens() {
    console.log('🔍 Checking OAuth tokens in database...\n');

    const tokens = await db.select().from(oauthTokens);

    console.log(`📊 Total tokens: ${tokens.length}\n`);

    if (tokens.length > 0) {
        console.log('Tokens found:');
        tokens.forEach(token => {
            console.log(`  - ID: ${token.id}`);
            console.log(`    Project ID: ${token.projectId}`);
            console.log(`    Provider: ${token.provider}`);
            console.log(`    Email: ${token.accountEmail}`);
            console.log(`    Created: ${token.createdAt}`);
            console.log('');
        });
    } else {
        console.log('❌ NO TOKENS FOUND IN DATABASE!');
        console.log('\nThis means the OAuth callback is NOT saving tokens.');
        console.log('Check backend logs for errors during callback.');
    }

    process.exit(0);
}

checkTokens().catch(error => {
    console.error('❌ Error:', error);
    process.exit(1);
});

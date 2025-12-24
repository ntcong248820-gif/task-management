import { db, oauthTokens, gscSites, ga4Properties, gscData, ga4Data, eq, and } from '@repo/db';

async function checkAndSync() {
    const projectId = 27;

    console.log('🔍 Checking OAuth tokens for project', projectId);

    // Check OAuth tokens
    const tokens = await db
        .select()
        .from(oauthTokens)
        .where(eq(oauthTokens.projectId, projectId));

    console.log('\n📊 OAuth Tokens:');
    tokens.forEach(token => {
        console.log(`  - ${token.provider}: ${token.accountEmail || 'No email'}`);
        console.log(`    Expires: ${token.expiresAt}`);
    });

    // Check GSC sites
    console.log('\n🔍 Checking GSC sites...');
    const sites = await db
        .select()
        .from(gscSites)
        .where(eq(gscSites.projectId, projectId));

    console.log(`Found ${sites.length} GSC site(s):`);
    sites.forEach(site => {
        console.log(`  - ${site.siteUrl} (${site.permissionLevel})`);
    });

    // Check GA4 properties
    console.log('\n🔍 Checking GA4 properties...');
    const properties = await db
        .select()
        .from(ga4Properties)
        .where(eq(ga4Properties.projectId, projectId));

    console.log(`Found ${properties.length} GA4 property(ies):`);
    properties.forEach(prop => {
        console.log(`  - ${prop.propertyId}: ${prop.propertyName || 'No name'}`);
    });

    // Check existing data
    console.log('\n📈 Checking existing data...');
    const gscCount = await db
        .select()
        .from(gscData)
        .where(eq(gscData.projectId, projectId));

    const ga4Count = await db
        .select()
        .from(ga4Data)
        .where(eq(ga4Data.projectId, projectId));

    console.log(`  - GSC data rows: ${gscCount.length}`);
    console.log(`  - GA4 data rows: ${ga4Count.length}`);

    // Trigger sync if we have the necessary info
    if (sites.length > 0) {
        console.log('\n🔄 Triggering GSC sync...');
        const siteUrl = sites[0].siteUrl;

        try {
            const response = await fetch('http://localhost:3001/api/integrations/gsc/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId,
                    siteUrl,
                    days: 90
                })
            });

            const result = await response.json();
            console.log('GSC Sync Result:', result);
        } catch (error: any) {
            console.error('GSC Sync Error:', error.message);
        }
    } else {
        console.log('\n⚠️  No GSC site URL found. Cannot trigger sync.');
        console.log('   You need to discover sites first or manually add a site URL.');
    }

    if (properties.length > 0) {
        console.log('\n🔄 Triggering GA4 sync...');
        const propertyId = properties[0].propertyId;

        try {
            const response = await fetch('http://localhost:3001/api/integrations/ga4/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId,
                    propertyId,
                    days: 90
                })
            });

            const result = await response.json();
            console.log('GA4 Sync Result:', result);
        } catch (error: any) {
            console.error('GA4 Sync Error:', error.message);
        }
    } else {
        console.log('\n⚠️  No GA4 property ID found. Cannot trigger sync.');
        console.log('   You need to discover properties first or manually add a property ID.');
    }

    process.exit(0);
}

checkAndSync().catch(console.error);

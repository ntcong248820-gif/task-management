/**
 * Discover Sites and Properties, then Trigger Data Sync
 * 
 * This script:
 * 1. Discovers GSC sites and GA4 properties
 * 2. Saves them to the database
 * 3. Triggers data sync for both integrations
 */

const API_BASE = 'http://localhost:3001/api';
const PROJECT_ID = 27;
const DAYS = 90;

async function discoverAndSync() {
    console.log('🚀 Starting discovery and sync process...\n');

    // Step 1: Discover and save GSC sites
    console.log('📍 Step 1: Discovering GSC sites...');
    try {
        const gscSitesResponse = await fetch(
            `${API_BASE}/integrations/gsc/sites?projectId=${PROJECT_ID}&save=true`
        );
        const gscSitesData = await gscSitesResponse.json();

        if (gscSitesData.success) {
            console.log('✅ GSC Sites discovered:');
            gscSitesData.data.sites.forEach((site: any) => {
                console.log(`   - ${site.siteUrl} (${site.permissionLevel})`);
            });
            console.log(`   Saved to database: ${gscSitesData.data.saved}\n`);
        } else {
            console.error('❌ Failed to discover GSC sites:', gscSitesData.error);
            console.log('');
        }
    } catch (error: any) {
        console.error('❌ Error discovering GSC sites:', error.message);
        console.log('');
    }

    // Step 2: Discover and save GA4 properties
    console.log('📍 Step 2: Discovering GA4 properties...');
    try {
        const ga4PropsResponse = await fetch(
            `${API_BASE}/integrations/ga4/properties?projectId=${PROJECT_ID}&save=true`
        );
        const ga4PropsData = await ga4PropsResponse.json();

        if (ga4PropsData.success) {
            console.log('✅ GA4 Properties discovered:');
            ga4PropsData.data.properties.forEach((prop: any) => {
                console.log(`   - ${prop.propertyId}: ${prop.propertyName}`);
            });
            console.log(`   Saved to database: ${ga4PropsData.data.saved}\n`);
        } else {
            console.error('❌ Failed to discover GA4 properties:', ga4PropsData.error);
            console.log('');
        }
    } catch (error: any) {
        console.error('❌ Error discovering GA4 properties:', error.message);
        console.log('');
    }

    // Step 3: Get the saved sites and properties from DB
    console.log('📍 Step 3: Fetching saved configuration from database...');
    const { db, gscSites, ga4Properties, eq } = await import('@repo/db');

    const sites = await db
        .select()
        .from(gscSites)
        .where(eq(gscSites.projectId, PROJECT_ID));

    const properties = await db
        .select()
        .from(ga4Properties)
        .where(eq(ga4Properties.projectId, PROJECT_ID));

    console.log(`   Found ${sites.length} GSC site(s)`);
    console.log(`   Found ${properties.length} GA4 property(ies)\n`);

    // Step 4: Trigger GSC sync
    if (sites.length > 0) {
        console.log('📍 Step 4: Triggering GSC data sync...');
        const siteUrl = sites[0].siteUrl;
        console.log(`   Using site: ${siteUrl}`);

        try {
            const syncResponse = await fetch(`${API_BASE}/integrations/gsc/sync`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId: PROJECT_ID,
                    siteUrl,
                    days: DAYS,
                }),
            });

            const syncData = await syncResponse.json();

            if (syncData.success) {
                console.log(`✅ GSC Sync completed: ${syncData.rowsSynced} rows synced`);
                console.log(`   Date range: ${syncData.dateRange.start} to ${syncData.dateRange.end}\n`);
            } else {
                console.error('❌ GSC Sync failed:', syncData.error);
                console.log('');
            }
        } catch (error: any) {
            console.error('❌ Error syncing GSC data:', error.message);
            console.log('');
        }
    } else {
        console.log('⚠️  Step 4: Skipped - No GSC sites found\n');
    }

    // Step 5: Trigger GA4 sync
    if (properties.length > 0) {
        console.log('📍 Step 5: Triggering GA4 data sync...');
        const propertyId = properties[0].propertyId;
        console.log(`   Using property: ${propertyId}`);

        try {
            const syncResponse = await fetch(`${API_BASE}/integrations/ga4/sync`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId: PROJECT_ID,
                    propertyId,
                    days: DAYS,
                }),
            });

            const syncData = await syncResponse.json();

            if (syncData.success) {
                console.log(`✅ GA4 Sync completed: ${syncData.rowsSynced} rows synced`);
                console.log(`   Date range: ${syncData.dateRange.start} to ${syncData.dateRange.end}\n`);
            } else {
                console.error('❌ GA4 Sync failed:', syncData.error);
                console.log('');
            }
        } catch (error: any) {
            console.error('❌ Error syncing GA4 data:', error.message);
            console.log('');
        }
    } else {
        console.log('⚠️  Step 5: Skipped - No GA4 properties found\n');
    }

    console.log('🎉 Discovery and sync process completed!');
    process.exit(0);
}

discoverAndSync().catch((error) => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
});

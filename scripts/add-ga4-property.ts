/**
 * Manually Add GA4 Property
 * 
 * Use this if you know your GA4 property ID and want to skip the discovery step
 * (which requires enabling the Analytics Admin API)
 */

import { db, ga4Properties, eq, and } from '@repo/db';

const PROJECT_ID = 27;
const PROPERTY_ID = process.argv[2]; // Get from command line argument
const PROPERTY_NAME = process.argv[3] || 'Manual Property';

async function addGA4Property() {
    if (!PROPERTY_ID) {
        console.error('❌ Error: Property ID is required');
        console.log('\nUsage: npx tsx scripts/add-ga4-property.ts <PROPERTY_ID> [PROPERTY_NAME]');
        console.log('Example: npx tsx scripts/add-ga4-property.ts 123456789 "My Website"');
        process.exit(1);
    }

    console.log(`📍 Adding GA4 property ${PROPERTY_ID} to project ${PROJECT_ID}...`);

    // Check if property already exists
    const existing = await db
        .select()
        .from(ga4Properties)
        .where(
            and(
                eq(ga4Properties.projectId, PROJECT_ID),
                eq(ga4Properties.propertyId, PROPERTY_ID)
            )
        )
        .limit(1);

    if (existing.length > 0) {
        console.log('⚠️  Property already exists in database');
        process.exit(0);
    }

    // Insert new property
    await db.insert(ga4Properties).values({
        projectId: PROJECT_ID,
        propertyId: PROPERTY_ID,
        propertyName: PROPERTY_NAME,
    });

    console.log(`✅ GA4 property added successfully!`);
    console.log(`   Property ID: ${PROPERTY_ID}`);
    console.log(`   Property Name: ${PROPERTY_NAME}`);

    // Now trigger sync
    console.log('\n📍 Triggering GA4 data sync...');

    try {
        const response = await fetch('http://localhost:3001/api/integrations/ga4/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                projectId: PROJECT_ID,
                propertyId: PROPERTY_ID,
                days: 90,
            }),
        });

        const result = await response.json();

        if (result.success) {
            console.log(`✅ GA4 Sync completed: ${result.rowsSynced} rows synced`);
            console.log(`   Date range: ${result.dateRange.start} to ${result.dateRange.end}`);
        } else {
            console.error('❌ GA4 Sync failed:', result.error);
        }
    } catch (error: any) {
        console.error('❌ Error syncing GA4 data:', error.message);
    }

    process.exit(0);
}

addGA4Property().catch((error) => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
});

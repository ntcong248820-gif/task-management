import { db, ga4Properties } from '@repo/db';

async function main() {
    const propertyId = '289356816';
    const projectId = 1;

    console.log(`Inserting GA4 Property ID ${propertyId} for project ${projectId}...`);

    await db
        .insert(ga4Properties)
        .values({
            projectId,
            propertyId,
        })
        .onConflictDoNothing();

    console.log('✅ GA4 Property ID inserted successfully!');
    process.exit(0);
}

main().catch(err => {
    console.error('❌ Failed to insert Property ID:', err);
    process.exit(1);
});

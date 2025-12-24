import { db } from '../../../../packages/db/src/index';
import { gscData, ga4Data, projects } from '../../../../packages/db/src/schema';
import { sql } from '../../../../packages/db/node_modules/drizzle-orm';

async function checkDatabaseData() {
    console.log('🔍 Checking database for GSC and GA4 data...\n');

    // Check projects
    const allProjects = await db.select().from(projects);
    console.log(`📊 Projects in database: ${allProjects.length}`);
    allProjects.forEach(p => {
        console.log(`  - ID: ${p.id}, Name: ${p.name}, Domain: ${p.domain || 'NULL'}`);
    });
    console.log('');

    // Check GSC data
    const gscCount = await db.select({ count: sql<number>`count(*)` }).from(gscData);
    console.log(`📈 GSC Data rows: ${gscCount[0].count}`);

    if (Number(gscCount[0].count) > 0) {
        // Get sample data
        const gscSample = await db.select().from(gscData).limit(5);
        console.log('  Sample GSC data:');
        gscSample.forEach(row => {
            console.log(`    - Project ID: ${row.projectId}, Date: ${row.date}, Clicks: ${row.clicks}, Impressions: ${row.impressions}`);
        });

        // Get data by project
        const gscByProject = await db
            .select({
                projectId: gscData.projectId,
                count: sql<number>`count(*)`,
                totalClicks: sql<number>`sum(clicks)`,
            })
            .from(gscData)
            .groupBy(gscData.projectId);

        console.log('\n  GSC data by project:');
        gscByProject.forEach(row => {
            console.log(`    - Project ID: ${row.projectId}, Rows: ${row.count}, Total Clicks: ${row.totalClicks}`);
        });
    }
    console.log('');

    // Check GA4 data
    const ga4Count = await db.select({ count: sql<number>`count(*)` }).from(ga4Data);
    console.log(`📊 GA4 Data rows: ${ga4Count[0].count}`);

    if (Number(ga4Count[0].count) > 0) {
        // Get sample data
        const ga4Sample = await db.select().from(ga4Data).limit(5);
        console.log('  Sample GA4 data:');
        ga4Sample.forEach(row => {
            console.log(`    - Project ID: ${row.projectId}, Date: ${row.date}, Sessions: ${row.sessions}, Users: ${row.users}`);
        });

        // Get data by project
        const ga4ByProject = await db
            .select({
                projectId: ga4Data.projectId,
                count: sql<number>`count(*)`,
                totalSessions: sql<number>`sum(sessions)`,
            })
            .from(ga4Data)
            .groupBy(ga4Data.projectId);

        console.log('\n  GA4 data by project:');
        ga4ByProject.forEach(row => {
            console.log(`    - Project ID: ${row.projectId}, Rows: ${row.count}, Total Sessions: ${row.totalSessions}`);
        });
    }

    console.log('\n✅ Database check complete!');
    process.exit(0);
}

checkDatabaseData().catch(error => {
    console.error('❌ Error checking database:', error);
    process.exit(1);
});

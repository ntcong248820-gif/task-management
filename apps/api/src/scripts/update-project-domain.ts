import { db } from '../../../../packages/db/src/index';
import { projects } from '../../../../packages/db/src/schema';
import { eq } from '../../../../packages/db/node_modules/drizzle-orm';

async function updateProjectDomain() {
    console.log('🔧 Updating project domain...\n');

    const projectId = 27;
    const domain = 'topzone.vn'; // Change this to your actual domain

    const [updated] = await db
        .update(projects)
        .set({ domain })
        .where(eq(projects.id, projectId))
        .returning();

    console.log(`✅ Updated project ${projectId}:`);
    console.log(`   Name: ${updated.name}`);
    console.log(`   Domain: ${updated.domain}`);
    console.log('\n✨ Done! Now you can connect GSC and GA4 in the Integrations page.');

    process.exit(0);
}

updateProjectDomain().catch(error => {
    console.error('❌ Error:', error);
    process.exit(1);
});

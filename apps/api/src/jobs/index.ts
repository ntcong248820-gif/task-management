/**
 * Cron Jobs Index
 * Export all cron jobs for easy registration in main app
 */

export { gscSyncJob, startGSCSyncJob, stopGSCSyncJob } from './sync-gsc';
export { ga4SyncJob, startGA4SyncJob, stopGA4SyncJob } from './sync-ga4';

/**
 * Start all sync jobs
 */
export function startAllSyncJobs() {
    const { startGSCSyncJob } = require('./sync-gsc');
    const { startGA4SyncJob } = require('./sync-ga4');

    startGSCSyncJob();
    startGA4SyncJob();

    console.log('📅 All sync jobs started');
}

/**
 * Stop all sync jobs
 */
export function stopAllSyncJobs() {
    const { stopGSCSyncJob } = require('./sync-gsc');
    const { stopGA4SyncJob } = require('./sync-ga4');

    stopGSCSyncJob();
    stopGA4SyncJob();

    console.log('🛑 All sync jobs stopped');
}

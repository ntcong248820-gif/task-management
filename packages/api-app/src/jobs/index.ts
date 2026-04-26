/**
 * Cron Jobs Index
 * Export all cron jobs for easy registration in main app
 */

export { gscSyncJob, startGSCSyncJob, stopGSCSyncJob } from './sync-gsc';
export { ga4SyncJob, startGA4SyncJob, stopGA4SyncJob } from './sync-ga4';
import { logger } from '../utils/logger';
import { startGSCSyncJob, stopGSCSyncJob } from './sync-gsc';
import { startGA4SyncJob, stopGA4SyncJob } from './sync-ga4';

const log = logger.child('Jobs');

/**
 * Start all sync jobs
 */
export function startAllSyncJobs() {
    startGSCSyncJob();
    startGA4SyncJob();

    log.info('All sync jobs started');
}

/**
 * Stop all sync jobs
 */
export function stopAllSyncJobs() {
    stopGSCSyncJob();
    stopGA4SyncJob();

    log.info('All sync jobs stopped');
}

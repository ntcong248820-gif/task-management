import { Hono } from 'hono';
import { verifyCronSecret } from '../../utils/verify-cron-secret';
import syncGscRoute from './sync-gsc';
import syncGa4Route from './sync-ga4';

const app = new Hono();

// Auth check applied to all cron routes before any DB access
app.use('*', verifyCronSecret);

app.route('/sync-gsc', syncGscRoute);
app.route('/sync-ga4', syncGa4Route);

export default app;

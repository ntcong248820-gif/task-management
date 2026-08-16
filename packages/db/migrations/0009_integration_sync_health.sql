-- Phase 3: Sync Health & Source Management
-- Add active-source flag and health-summary columns to connection tables.
-- Backfill picks the most-recently-updated row per (workspace_id, project_id)
-- as active; older duplicate rows for the same provider/project are deactivated.
-- Additive only: no DROP COLUMN, no DELETE, no TRUNCATE.

ALTER TABLE "gsc_connections" ADD COLUMN IF NOT EXISTS "is_active" boolean NOT NULL DEFAULT true;
ALTER TABLE "gsc_connections" ADD COLUMN IF NOT EXISTS "last_attempted_at" timestamp;
ALTER TABLE "gsc_connections" ADD COLUMN IF NOT EXISTS "last_rows_synced" integer;
ALTER TABLE "gsc_connections" ADD COLUMN IF NOT EXISTS "last_duration_ms" integer;

ALTER TABLE "ga4_connections" ADD COLUMN IF NOT EXISTS "is_active" boolean NOT NULL DEFAULT true;
ALTER TABLE "ga4_connections" ADD COLUMN IF NOT EXISTS "last_attempted_at" timestamp;
ALTER TABLE "ga4_connections" ADD COLUMN IF NOT EXISTS "last_rows_synced" integer;
ALTER TABLE "ga4_connections" ADD COLUMN IF NOT EXISTS "last_duration_ms" integer;

-- Backfill: if a project/workspace has more than one connection row for a
-- provider, keep only the most-recently-updated one active.
WITH ranked_gsc AS (
  SELECT id,
    ROW_NUMBER() OVER (PARTITION BY workspace_id, project_id ORDER BY updated_at DESC, id DESC) AS rn
  FROM "gsc_connections"
)
UPDATE "gsc_connections" c
SET is_active = false
FROM ranked_gsc r
WHERE c.id = r.id AND r.rn > 1;

WITH ranked_ga4 AS (
  SELECT id,
    ROW_NUMBER() OVER (PARTITION BY workspace_id, project_id ORDER BY updated_at DESC, id DESC) AS rn
  FROM "ga4_connections"
)
UPDATE "ga4_connections" c
SET is_active = false
FROM ranked_ga4 r
WHERE c.id = r.id AND r.rn > 1;

-- Exactly one active GSC source and one active GA4 source per project.
CREATE UNIQUE INDEX IF NOT EXISTS "gsc_conn_active_source_idx"
  ON "gsc_connections" ("workspace_id", "project_id")
  WHERE "is_active" = true;

CREATE UNIQUE INDEX IF NOT EXISTS "ga4_conn_active_source_idx"
  ON "ga4_connections" ("workspace_id", "project_id")
  WHERE "is_active" = true;

-- Unique resource rows per project (no duplicate site_url / property_id).
CREATE UNIQUE INDEX IF NOT EXISTS "gsc_conn_resource_unique_idx"
  ON "gsc_connections" ("workspace_id", "project_id", "site_url");

CREATE UNIQUE INDEX IF NOT EXISTS "ga4_conn_resource_unique_idx"
  ON "ga4_connections" ("workspace_id", "project_id", "property_id");

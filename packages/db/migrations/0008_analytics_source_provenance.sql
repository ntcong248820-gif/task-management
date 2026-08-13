-- Phase 2: Data Provenance Schema
-- Add source provenance to raw fact rows. Legacy rows keep NULL provenance
-- and are excluded from user-facing analytics/reporting (Phase 4 filters).
-- No inference/backfill of provenance for existing rows.

ALTER TABLE "gsc_data" ADD COLUMN IF NOT EXISTS "site_url" varchar(500);
ALTER TABLE "ga4_data" ADD COLUMN IF NOT EXISTS "property_id" varchar(100);

DROP INDEX IF EXISTS "gsc_data_unique_idx";
DROP INDEX IF EXISTS "ga4_data_unique_idx";

CREATE UNIQUE INDEX IF NOT EXISTS "gsc_data_unique_v2_idx" ON "gsc_data"
  ("project_id", "site_url", "date", "page", "query", "country", "device");

CREATE UNIQUE INDEX IF NOT EXISTS "ga4_data_unique_v2_idx" ON "ga4_data"
  ("project_id", "property_id", "date", "source", "medium", "device_category");

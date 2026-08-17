-- Phase 5: Alert To Task Workflow
-- Adds a lifecycle to alerts (new -> accepted / dismissed / task_created)
-- and a link back to a task created from an alert.
-- Additive only: no DROP COLUMN, no DELETE, no TRUNCATE.

ALTER TABLE "alerts" ADD COLUMN IF NOT EXISTS "status" varchar(20) NOT NULL DEFAULT 'new';
ALTER TABLE "alerts" ADD COLUMN IF NOT EXISTS "accepted_by" text;
ALTER TABLE "alerts" ADD COLUMN IF NOT EXISTS "accepted_at" timestamp;
ALTER TABLE "alerts" ADD COLUMN IF NOT EXISTS "dismissed_by" text;
ALTER TABLE "alerts" ADD COLUMN IF NOT EXISTS "dismissed_at" timestamp;
ALTER TABLE "alerts" ADD COLUMN IF NOT EXISTS "linked_task_id" uuid;

-- Backfill: existing rows get the default via ADD COLUMN, but make it explicit.
UPDATE "alerts" SET "status" = 'new' WHERE "status" IS NULL;

DO $$ BEGIN
  ALTER TABLE "alerts" ADD CONSTRAINT "alerts_linked_task_id_tasks_id_fk"
    FOREIGN KEY ("linked_task_id") REFERENCES "tasks"("id") ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "alerts" ADD CONSTRAINT "alerts_status_check"
    CHECK ("status" IN ('new','accepted','dismissed','task_created'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "alerts_workspace_status_idx" ON "alerts" ("workspace_id", "status");

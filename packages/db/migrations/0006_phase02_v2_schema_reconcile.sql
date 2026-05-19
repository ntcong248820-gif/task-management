CREATE EXTENSION IF NOT EXISTS "pgcrypto";
--> statement-breakpoint
SET search_path TO public;
--> statement-breakpoint
DO $$
DECLARE
  index_record record;
BEGIN
  IF to_regclass('public.projects') IS NOT NULL
    AND (
      NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'projects' AND column_name = 'workspace_id'
      )
      OR EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'projects' AND column_name = 'id' AND data_type <> 'uuid'
      )
    )
  THEN
    IF to_regclass('public.projects_legacy_v1_20260519') IS NOT NULL THEN
      RAISE EXCEPTION 'projects legacy backup already exists; aborting to avoid overwriting data';
    END IF;
    ALTER TABLE public.projects RENAME TO projects_legacy_v1_20260519;
  END IF;

  IF to_regclass('public.tasks') IS NOT NULL
    AND (
      NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'tasks' AND column_name = 'workspace_id'
      )
      OR EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'tasks' AND column_name = 'id' AND data_type <> 'uuid'
      )
    )
  THEN
    IF to_regclass('public.tasks_legacy_v1_20260519') IS NOT NULL THEN
      RAISE EXCEPTION 'tasks legacy backup already exists; aborting to avoid overwriting data';
    END IF;
    ALTER TABLE public.tasks RENAME TO tasks_legacy_v1_20260519;
  END IF;

  IF to_regclass('public.time_logs') IS NOT NULL
    AND (
      NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'time_logs' AND column_name = 'workspace_id'
      )
      OR EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'time_logs' AND column_name = 'id' AND data_type <> 'uuid'
      )
    )
  THEN
    IF to_regclass('public.time_logs_legacy_v1_20260519') IS NOT NULL THEN
      RAISE EXCEPTION 'time_logs legacy backup already exists; aborting to avoid overwriting data';
    END IF;
    ALTER TABLE public.time_logs RENAME TO time_logs_legacy_v1_20260519;
  END IF;

  IF to_regclass('public.gsc_data') IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'gsc_data' AND column_name = 'project_id' AND data_type <> 'uuid'
    )
  THEN
    IF to_regclass('public.gsc_data_legacy_v1_20260519') IS NOT NULL THEN
      RAISE EXCEPTION 'gsc_data legacy backup already exists; aborting to avoid overwriting data';
    END IF;
    ALTER TABLE public.gsc_data RENAME TO gsc_data_legacy_v1_20260519;
  END IF;

  IF to_regclass('public.gsc_data_aggregated') IS NOT NULL
    AND (
      NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'gsc_data_aggregated' AND column_name = 'site_url'
      )
      OR EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'gsc_data_aggregated' AND column_name = 'project_id' AND data_type <> 'uuid'
      )
    )
  THEN
    IF to_regclass('public.gsc_data_aggregated_legacy_v1_20260519') IS NOT NULL THEN
      RAISE EXCEPTION 'gsc_data_aggregated legacy backup already exists; aborting to avoid overwriting data';
    END IF;
    ALTER TABLE public.gsc_data_aggregated RENAME TO gsc_data_aggregated_legacy_v1_20260519;
  END IF;

  IF to_regclass('public.ga4_data') IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'ga4_data' AND column_name = 'project_id' AND data_type <> 'uuid'
    )
  THEN
    IF to_regclass('public.ga4_data_legacy_v1_20260519') IS NOT NULL THEN
      RAISE EXCEPTION 'ga4_data legacy backup already exists; aborting to avoid overwriting data';
    END IF;
    ALTER TABLE public.ga4_data RENAME TO ga4_data_legacy_v1_20260519;
  END IF;

  FOR index_record IN
    SELECT indexname
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename IN (
        'projects_legacy_v1_20260519',
        'tasks_legacy_v1_20260519',
        'time_logs_legacy_v1_20260519',
        'gsc_data_legacy_v1_20260519',
        'gsc_data_aggregated_legacy_v1_20260519',
        'ga4_data_legacy_v1_20260519'
      )
      AND indexname NOT LIKE '%_legacy_v1_20260519'
  LOOP
    EXECUTE format(
      'ALTER INDEX IF EXISTS public.%I RENAME TO %I',
      index_record.indexname,
      left(index_record.indexname || '_legacy_v1_20260519', 63)
    );
  END LOOP;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "email" text NOT NULL,
  "email_verified" boolean DEFAULT false NOT NULL,
  "image" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "user_email_unique" UNIQUE ("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "organization" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "slug" text NOT NULL,
  "logo" text,
  "created_at" timestamp NOT NULL,
  "metadata" text,
  CONSTRAINT "organization_slug_unique" UNIQUE ("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "session" (
  "id" text PRIMARY KEY NOT NULL,
  "expires_at" timestamp NOT NULL,
  "token" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp NOT NULL,
  "ip_address" text,
  "user_agent" text,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE cascade,
  "active_organization_id" text,
  CONSTRAINT "session_token_unique" UNIQUE ("token")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "account" (
  "id" text PRIMARY KEY NOT NULL,
  "account_id" text NOT NULL,
  "provider_id" text NOT NULL,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE cascade,
  "access_token" text,
  "refresh_token" text,
  "id_token" text,
  "access_token_expires_at" timestamp,
  "refresh_token_expires_at" timestamp,
  "scope" text,
  "password" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "verification" (
  "id" text PRIMARY KEY NOT NULL,
  "identifier" text NOT NULL,
  "value" text NOT NULL,
  "expires_at" timestamp NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "member" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL REFERENCES "organization"("id") ON DELETE cascade,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE cascade,
  "role" text DEFAULT 'member' NOT NULL,
  "created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "invitation" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL REFERENCES "organization"("id") ON DELETE cascade,
  "email" text NOT NULL,
  "role" text,
  "status" text DEFAULT 'pending' NOT NULL,
  "expires_at" timestamp NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "inviter_id" text NOT NULL REFERENCES "user"("id") ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "projects" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "workspace_id" text NOT NULL,
  "name" text NOT NULL,
  "domain" varchar(500),
  "description" text,
  "color" varchar(7),
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "gsc_connections" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL REFERENCES "projects"("id") ON DELETE cascade,
  "workspace_id" text NOT NULL,
  "authorized_by_user_id" text NOT NULL,
  "account_email" varchar(255),
  "site_url" varchar(500) NOT NULL,
  "permission_level" varchar(50),
  "access_token" text NOT NULL,
  "refresh_token" text NOT NULL,
  "token_expires_at" timestamp NOT NULL,
  "last_synced_at" timestamp,
  "sync_status" varchar(20) DEFAULT 'idle' NOT NULL,
  "sync_error" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "gsc_conn_sync_status_check" CHECK ("sync_status" IN ('idle','syncing','error'))
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ga4_connections" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL REFERENCES "projects"("id") ON DELETE cascade,
  "workspace_id" text NOT NULL,
  "authorized_by_user_id" text NOT NULL,
  "account_email" varchar(255),
  "property_id" varchar(100) NOT NULL,
  "property_name" varchar(255),
  "measurement_id" varchar(50),
  "access_token" text NOT NULL,
  "refresh_token" text NOT NULL,
  "token_expires_at" timestamp NOT NULL,
  "last_synced_at" timestamp,
  "sync_status" varchar(20) DEFAULT 'idle' NOT NULL,
  "sync_error" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "ga4_conn_sync_status_check" CHECK ("sync_status" IN ('idle','syncing','error'))
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "goals" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "workspace_id" text NOT NULL,
  "project_id" uuid NOT NULL REFERENCES "projects"("id") ON DELETE cascade,
  "title" text NOT NULL,
  "description" text,
  "type" varchar(20) NOT NULL,
  "target_metric" varchar(100),
  "target_value" numeric(12, 4),
  "start_date" date NOT NULL,
  "end_date" date NOT NULL,
  "status" varchar(20) DEFAULT 'active' NOT NULL,
  "created_by_user_id" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "goals_type_check" CHECK ("type" IN ('traffic','ranking','conversion','custom')),
  CONSTRAINT "goals_status_check" CHECK ("status" IN ('active','completed','cancelled'))
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sprints" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "workspace_id" text NOT NULL,
  "project_id" uuid REFERENCES "projects"("id") ON DELETE set null,
  "goal_id" uuid REFERENCES "goals"("id") ON DELETE set null,
  "name" text NOT NULL,
  "description" text,
  "start_date" date NOT NULL,
  "end_date" date NOT NULL,
  "status" varchar(20) DEFAULT 'planning' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "sprints_status_check" CHECK ("status" IN ('planning','active','completed'))
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "task_templates" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "workspace_id" text NOT NULL,
  "title" text NOT NULL,
  "description" text,
  "task_type" varchar(20),
  "priority" varchar(10) DEFAULT 'medium' NOT NULL,
  "affects_website" boolean DEFAULT true NOT NULL,
  "estimated_time" integer,
  "recurring_config" jsonb NOT NULL,
  "tags" text[],
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "task_templates_task_type_check" CHECK ("task_type" IS NULL OR "task_type" IN ('technical','content','links','planning','meeting','audit')),
  CONSTRAINT "task_templates_priority_check" CHECK ("priority" IN ('low','medium','high','urgent'))
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tasks" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "workspace_id" text NOT NULL,
  "project_id" uuid NOT NULL REFERENCES "projects"("id") ON DELETE cascade,
  "goal_id" uuid REFERENCES "goals"("id") ON DELETE set null,
  "sprint_id" uuid REFERENCES "sprints"("id") ON DELETE set null,
  "title" text NOT NULL,
  "description" text,
  "status" varchar(20) DEFAULT 'backlog' NOT NULL,
  "task_type" varchar(20),
  "priority" varchar(10) DEFAULT 'medium' NOT NULL,
  "affects_website" boolean DEFAULT true NOT NULL,
  "assignee_id" text,
  "reporter_id" text NOT NULL,
  "estimated_time" integer,
  "time_spent" integer DEFAULT 0 NOT NULL,
  "start_date" date,
  "due_date" date,
  "completed_at" timestamp,
  "expected_impact_start" date,
  "expected_impact_end" date,
  "actual_impact" jsonb,
  "is_recurring" boolean DEFAULT false NOT NULL,
  "recurring_template_id" uuid REFERENCES "task_templates"("id") ON DELETE set null,
  "recurring_config" jsonb,
  "tags" text[],
  "notes" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "tasks_status_check" CHECK ("status" IN ('backlog','todo','in_progress','blocked','in_review','done')),
  CONSTRAINT "tasks_task_type_check" CHECK ("task_type" IS NULL OR "task_type" IN ('technical','content','links','planning','meeting','audit')),
  CONSTRAINT "tasks_priority_check" CHECK ("priority" IN ('low','medium','high','urgent'))
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "time_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "task_id" uuid NOT NULL REFERENCES "tasks"("id") ON DELETE cascade,
  "workspace_id" text NOT NULL,
  "user_id" text NOT NULL,
  "started_at" timestamp NOT NULL,
  "ended_at" timestamp,
  "duration" integer,
  "note" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "alerts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "workspace_id" text NOT NULL,
  "project_id" uuid REFERENCES "projects"("id") ON DELETE cascade,
  "type" varchar(30) NOT NULL,
  "severity" varchar(20) DEFAULT 'info' NOT NULL,
  "title" text NOT NULL,
  "body" text NOT NULL,
  "metadata" jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "alerts_type_check" CHECK ("type" IN ('traffic_drop','ranking_drop','content_decay','anomaly','recommendation')),
  CONSTRAINT "alerts_severity_check" CHECK ("severity" IN ('info','warning','critical'))
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "alert_reads" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "alert_id" uuid NOT NULL REFERENCES "alerts"("id") ON DELETE cascade,
  "user_id" text NOT NULL,
  "read_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "gsc_data" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL REFERENCES "projects"("id") ON DELETE cascade,
  "date" date NOT NULL,
  "page" varchar(1000) NOT NULL,
  "query" varchar(500) NOT NULL,
  "country" varchar(10) DEFAULT 'all' NOT NULL,
  "device" varchar(20) DEFAULT 'all' NOT NULL,
  "clicks" integer DEFAULT 0 NOT NULL,
  "impressions" integer DEFAULT 0 NOT NULL,
  "ctr" numeric(5, 4) DEFAULT '0' NOT NULL,
  "position" numeric(5, 2) DEFAULT '0' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "gsc_data_aggregated" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL REFERENCES "projects"("id") ON DELETE cascade,
  "site_url" text NOT NULL,
  "date" date NOT NULL,
  "clicks" integer DEFAULT 0 NOT NULL,
  "impressions" integer DEFAULT 0 NOT NULL,
  "ctr" numeric(6, 4) DEFAULT '0' NOT NULL,
  "position" numeric(5, 2) DEFAULT '0' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ga4_data" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL REFERENCES "projects"("id") ON DELETE cascade,
  "date" date NOT NULL,
  "sessions" integer DEFAULT 0 NOT NULL,
  "users" integer DEFAULT 0 NOT NULL,
  "new_users" integer DEFAULT 0 NOT NULL,
  "engagement_rate" numeric(5, 4) DEFAULT '0' NOT NULL,
  "average_session_duration" numeric(10, 2) DEFAULT '0' NOT NULL,
  "conversions" integer DEFAULT 0 NOT NULL,
  "conversion_rate" numeric(5, 4) DEFAULT '0' NOT NULL,
  "revenue" numeric(12, 2) DEFAULT '0' NOT NULL,
  "source" varchar(255) DEFAULT '(direct)' NOT NULL,
  "medium" varchar(100) DEFAULT '(none)' NOT NULL,
  "device_category" varchar(50) DEFAULT 'desktop' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "session_userId_idx" ON "session" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "account_userId_idx" ON "account" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "verification_identifier_idx" ON "verification" USING btree ("identifier");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "organization_slug_uidx" ON "organization" USING btree ("slug");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "member_organizationId_idx" ON "member" USING btree ("organization_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "member_userId_idx" ON "member" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "invitation_organizationId_idx" ON "invitation" USING btree ("organization_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "invitation_email_idx" ON "invitation" USING btree ("email");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "projects_workspace_domain_unique" ON "projects" USING btree ("workspace_id", "domain");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "projects_workspace_idx" ON "projects" USING btree ("workspace_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "gsc_conn_project_idx" ON "gsc_connections" USING btree ("project_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "gsc_conn_workspace_idx" ON "gsc_connections" USING btree ("workspace_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ga4_conn_project_idx" ON "ga4_connections" USING btree ("project_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ga4_conn_workspace_idx" ON "ga4_connections" USING btree ("workspace_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "goals_workspace_project_status_idx" ON "goals" USING btree ("workspace_id", "project_id", "status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "goals_project_idx" ON "goals" USING btree ("project_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "goals_created_by_idx" ON "goals" USING btree ("created_by_user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sprints_workspace_idx" ON "sprints" USING btree ("workspace_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sprints_project_idx" ON "sprints" USING btree ("project_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "task_templates_workspace_idx" ON "task_templates" USING btree ("workspace_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tasks_workspace_status_idx" ON "tasks" USING btree ("workspace_id", "status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tasks_project_status_idx" ON "tasks" USING btree ("project_id", "status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tasks_sprint_idx" ON "tasks" USING btree ("sprint_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tasks_goal_idx" ON "tasks" USING btree ("goal_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tasks_assignee_workspace_idx" ON "tasks" USING btree ("assignee_id", "workspace_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tasks_due_date_idx" ON "tasks" USING btree ("due_date");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tasks_is_recurring_idx" ON "tasks" USING btree ("is_recurring");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tasks_completed_at_idx" ON "tasks" USING btree ("completed_at");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "tasks_recurring_template_date_unique" ON "tasks" USING btree ("recurring_template_id", "start_date");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "time_logs_task_id_idx" ON "time_logs" USING btree ("task_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "time_logs_user_idx" ON "time_logs" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "alerts_workspace_created_idx" ON "alerts" USING btree ("workspace_id", "created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "alerts_workspace_type_idx" ON "alerts" USING btree ("workspace_id", "type");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "alerts_workspace_severity_idx" ON "alerts" USING btree ("workspace_id", "severity");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "alert_reads_alert_user_unique" ON "alert_reads" USING btree ("alert_id", "user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "alert_reads_user_idx" ON "alert_reads" USING btree ("user_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "gsc_data_unique_idx" ON "gsc_data" USING btree ("project_id", "date", "page", "query", "country", "device");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "gsc_data_project_date_idx" ON "gsc_data" USING btree ("project_id", "date");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "gsc_data_project_page_idx" ON "gsc_data" USING btree ("project_id", "page");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "gsc_data_project_query_idx" ON "gsc_data" USING btree ("project_id", "query");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "gsc_agg_project_site_date_unique" ON "gsc_data_aggregated" USING btree ("project_id", "site_url", "date");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "gsc_agg_project_date_idx" ON "gsc_data_aggregated" USING btree ("project_id", "date");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "gsc_agg_date_idx" ON "gsc_data_aggregated" USING btree ("date");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "gsc_agg_site_url_idx" ON "gsc_data_aggregated" USING btree ("site_url");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ga4_data_unique_idx" ON "ga4_data" USING btree ("project_id", "date", "source", "medium", "device_category");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ga4_data_project_date_idx" ON "ga4_data" USING btree ("project_id", "date");

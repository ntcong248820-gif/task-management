CREATE TABLE "ga4_data" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
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
ALTER TABLE "ga4_data" ADD CONSTRAINT "ga4_data_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ga4_data_unique_idx" ON "ga4_data" USING btree ("project_id","date","source","medium","device_category");--> statement-breakpoint
CREATE INDEX "ga4_data_project_date_idx" ON "ga4_data" USING btree ("project_id","date");
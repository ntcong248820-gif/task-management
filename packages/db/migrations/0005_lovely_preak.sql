CREATE TABLE "gsc_data_aggregated" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"date" date NOT NULL,
	"clicks" integer DEFAULT 0 NOT NULL,
	"impressions" integer DEFAULT 0 NOT NULL,
	"ctr" text DEFAULT '0' NOT NULL,
	"position" text DEFAULT '0' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "gsc_data_aggregated" ADD CONSTRAINT "gsc_data_aggregated_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "gsc_agg_project_date_unique" ON "gsc_data_aggregated" USING btree ("project_id","date");--> statement-breakpoint
CREATE INDEX "gsc_agg_project_date_idx" ON "gsc_data_aggregated" USING btree ("project_id","date");--> statement-breakpoint
CREATE INDEX "gsc_agg_date_idx" ON "gsc_data_aggregated" USING btree ("date");
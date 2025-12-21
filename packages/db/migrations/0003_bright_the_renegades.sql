CREATE TABLE "gsc_data" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
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
ALTER TABLE "gsc_data" ADD CONSTRAINT "gsc_data_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "gsc_data_unique_idx" ON "gsc_data" USING btree ("project_id","date","page","query","country","device");--> statement-breakpoint
CREATE INDEX "gsc_data_project_date_idx" ON "gsc_data" USING btree ("project_id","date");--> statement-breakpoint
CREATE INDEX "gsc_data_project_page_idx" ON "gsc_data" USING btree ("project_id","page");--> statement-breakpoint
CREATE INDEX "gsc_data_project_query_idx" ON "gsc_data" USING btree ("project_id","query");
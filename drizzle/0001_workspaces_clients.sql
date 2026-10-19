CREATE SCHEMA IF NOT EXISTS "studio";
--> statement-breakpoint
CREATE TABLE "studio"."clients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"name" text NOT NULL,
	"status" text DEFAULT 'lead' NOT NULL,
	"website" text,
	"industry" text,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "clients_status_check" CHECK ("studio"."clients"."status" in ('lead', 'active', 'past')),
	CONSTRAINT "clients_name_not_blank" CHECK (length(trim("studio"."clients"."name")) > 0)
);
--> statement-breakpoint
CREATE TABLE "studio"."workspaces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "studio"."clients" ADD CONSTRAINT "clients_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "studio"."workspaces"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "clients_workspace_name_uq" ON "studio"."clients" USING btree ("workspace_id",lower("name")) WHERE "studio"."clients"."archived_at" is null;--> statement-breakpoint
CREATE INDEX "clients_workspace_status_idx" ON "studio"."clients" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "workspaces_slug_uq" ON "studio"."workspaces" USING btree ("slug");
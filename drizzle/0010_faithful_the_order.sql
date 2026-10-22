CREATE TABLE "studio"."retention_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"actor_user_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"target_id" uuid NOT NULL,
	"action" text NOT NULL,
	"policy_version" text NOT NULL,
	"reason" text,
	"counts" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "retention_events_kind_check" CHECK ("studio"."retention_events"."kind" in ('client','contact')),
	CONSTRAINT "retention_events_action_check" CHECK ("studio"."retention_events"."action" in ('remove','hold_set','hold_release')),
	CONSTRAINT "retention_events_reason_check" CHECK (("studio"."retention_events"."action"='remove' and "studio"."retention_events"."reason" is null) or ("studio"."retention_events"."action" in ('hold_set','hold_release') and "studio"."retention_events"."reason" is not null and "studio"."retention_events"."reason" in ('contract','payment','dispute','other_business_need'))),
	CONSTRAINT "retention_events_counts_check" CHECK (jsonb_typeof("studio"."retention_events"."counts")='object' and "studio"."retention_events"."counts" ?& array['clients','contacts','notes'] and ("studio"."retention_events"."counts" - 'clients' - 'contacts' - 'notes')='{}'::jsonb and ("studio"."retention_events"."counts"->>'clients') ~ '^(0|[1-9][0-9]*)$' and ("studio"."retention_events"."counts"->>'contacts') ~ '^(0|[1-9][0-9]*)$' and ("studio"."retention_events"."counts"->>'notes') ~ '^(0|[1-9][0-9]*)$' and ("studio"."retention_events"."action"='remove' or "studio"."retention_events"."counts"='{"clients":0,"contacts":0,"notes":0}'::jsonb))
);
--> statement-breakpoint
CREATE TABLE "studio"."retention_previews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"actor_user_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"target_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"policy_version" text NOT NULL,
	"snapshot_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone DEFAULT now() + interval '10 minutes' NOT NULL,
	CONSTRAINT "retention_previews_kind_check" CHECK ("studio"."retention_previews"."kind" in ('client','contact')),
	CONSTRAINT "retention_previews_hash_check" CHECK ("studio"."retention_previews"."snapshot_hash" ~ '^[a-f0-9]{64}$'),
	CONSTRAINT "retention_previews_expiry_check" CHECK ("studio"."retention_previews"."expires_at" > "studio"."retention_previews"."created_at")
);
--> statement-breakpoint
ALTER TABLE "studio"."clients" ADD COLUMN "retention_hold" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "studio"."clients" ADD COLUMN "retention_hold_reason" text;--> statement-breakpoint
ALTER TABLE "studio"."contacts" ADD COLUMN "retention_hold" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "studio"."contacts" ADD COLUMN "retention_hold_reason" text;--> statement-breakpoint
ALTER TABLE "studio"."retention_events" ADD CONSTRAINT "retention_events_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "studio"."workspaces"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "studio"."retention_events" ADD CONSTRAINT "retention_events_actor_user_id_owners_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "studio"."owners"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "studio"."retention_previews" ADD CONSTRAINT "retention_previews_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "studio"."workspaces"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "studio"."retention_previews" ADD CONSTRAINT "retention_previews_actor_user_id_owners_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "studio"."owners"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "retention_events_workspace_time_idx" ON "studio"."retention_events" USING btree ("workspace_id","created_at");--> statement-breakpoint
CREATE INDEX "retention_previews_expiry_idx" ON "studio"."retention_previews" USING btree ("workspace_id","expires_at");--> statement-breakpoint
CREATE INDEX "retention_previews_actor_idx" ON "studio"."retention_previews" USING btree ("workspace_id","actor_user_id");--> statement-breakpoint
CREATE INDEX "clients_retention_idx" ON "studio"."clients" USING btree ("workspace_id","archived_at","id");--> statement-breakpoint
CREATE INDEX "contacts_retention_idx" ON "studio"."contacts" USING btree ("workspace_id","archived_at","id");--> statement-breakpoint
ALTER TABLE "studio"."clients" ADD CONSTRAINT "clients_retention_hold_check" CHECK (("studio"."clients"."retention_hold" and "studio"."clients"."retention_hold_reason" is not null and "studio"."clients"."retention_hold_reason" in ('contract','payment','dispute','other_business_need')) or (not "studio"."clients"."retention_hold" and "studio"."clients"."retention_hold_reason" is null));--> statement-breakpoint
ALTER TABLE "studio"."contacts" ADD CONSTRAINT "contacts_retention_hold_check" CHECK (("studio"."contacts"."retention_hold" and "studio"."contacts"."retention_hold_reason" is not null and "studio"."contacts"."retention_hold_reason" in ('contract','payment','dispute','other_business_need')) or (not "studio"."contacts"."retention_hold" and "studio"."contacts"."retention_hold_reason" is null));
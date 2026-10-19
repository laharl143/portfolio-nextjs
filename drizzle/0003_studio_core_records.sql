CREATE TABLE "studio"."contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"full_name" text NOT NULL,
	"email" text,
	"phone" text,
	"preferred_channel" text,
	"is_primary" boolean DEFAULT false NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "contacts_preferred_channel_check" CHECK ("studio"."contacts"."preferred_channel" in ('email', 'phone', 'viber', 'whatsapp', 'other')),
	CONSTRAINT "contacts_full_name_not_blank" CHECK (length(trim("studio"."contacts"."full_name")) > 0)
);
--> statement-breakpoint
CREATE TABLE "studio"."contract_status_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"contract_id" uuid NOT NULL,
	"from_status" text,
	"to_status" text NOT NULL,
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "contract_status_events_from_status_check" CHECK ("studio"."contract_status_events"."from_status" in ('draft', 'sent', 'signed', 'active', 'ended', 'cancelled')),
	CONSTRAINT "contract_status_events_to_status_check" CHECK ("studio"."contract_status_events"."to_status" in ('draft', 'sent', 'signed', 'active', 'ended', 'cancelled')),
	CONSTRAINT "contract_status_events_opening_is_draft" CHECK ("studio"."contract_status_events"."from_status" is not null or "studio"."contract_status_events"."to_status" = 'draft'),
	CONSTRAINT "contract_status_events_from_to_differ" CHECK ("studio"."contract_status_events"."from_status" is distinct from "studio"."contract_status_events"."to_status")
);
--> statement-breakpoint
CREATE TABLE "studio"."contracts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"project_id" uuid,
	"title" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"amount_minor" bigint,
	"currency" text DEFAULT 'PHP' NOT NULL,
	"billing_cadence" text,
	"start_date" date,
	"end_date" date,
	"terms_summary" text,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "contracts_status_check" CHECK ("studio"."contracts"."status" in ('draft', 'sent', 'signed', 'active', 'ended', 'cancelled')),
	CONSTRAINT "contracts_billing_cadence_check" CHECK ("studio"."contracts"."billing_cadence" in ('one_time', 'monthly', 'milestone')),
	CONSTRAINT "contracts_title_not_blank" CHECK (length(trim("studio"."contracts"."title")) > 0),
	CONSTRAINT "contracts_amount_not_negative" CHECK ("studio"."contracts"."amount_minor" >= 0),
	CONSTRAINT "contracts_currency_check" CHECK ("studio"."contracts"."currency" ~ '^[A-Z]{3}$'),
	CONSTRAINT "contracts_end_after_start" CHECK ("studio"."contracts"."end_date" is null or "studio"."contracts"."start_date" is null or "studio"."contracts"."end_date" >= "studio"."contracts"."start_date")
);
--> statement-breakpoint
CREATE TABLE "studio"."notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"body" text NOT NULL,
	"client_id" uuid,
	"contact_id" uuid,
	"project_id" uuid,
	"contract_id" uuid,
	"system_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notes_body_not_blank" CHECK (length(trim("studio"."notes"."body")) > 0),
	CONSTRAINT "notes_exactly_one_target" CHECK (num_nonnulls("studio"."notes"."client_id", "studio"."notes"."contact_id", "studio"."notes"."project_id", "studio"."notes"."contract_id", "studio"."notes"."system_id") = 1)
);
--> statement-breakpoint
CREATE TABLE "studio"."project_systems" (
	"workspace_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"system_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_systems_pk" PRIMARY KEY("project_id","system_id")
);
--> statement-breakpoint
CREATE TABLE "studio"."projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"name" text NOT NULL,
	"status" text DEFAULT 'planned' NOT NULL,
	"description" text,
	"start_date" date,
	"target_end_date" date,
	"actual_end_date" date,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "projects_id_client_uq" UNIQUE("id","client_id"),
	CONSTRAINT "projects_status_check" CHECK ("studio"."projects"."status" in ('planned', 'active', 'on_hold', 'done', 'cancelled')),
	CONSTRAINT "projects_name_not_blank" CHECK (length(trim("studio"."projects"."name")) > 0),
	CONSTRAINT "projects_target_end_after_start" CHECK ("studio"."projects"."target_end_date" is null or "studio"."projects"."start_date" is null or "studio"."projects"."target_end_date" >= "studio"."projects"."start_date"),
	CONSTRAINT "projects_actual_end_after_start" CHECK ("studio"."projects"."actual_end_date" is null or "studio"."projects"."start_date" is null or "studio"."projects"."actual_end_date" >= "studio"."projects"."start_date"),
	CONSTRAINT "projects_actual_end_when_finished" CHECK ("studio"."projects"."actual_end_date" is null or "studio"."projects"."status" in ('done', 'cancelled'))
);
--> statement-breakpoint
CREATE TABLE "studio"."system_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"from_system_id" text NOT NULL,
	"to_system_id" text NOT NULL,
	"label" text NOT NULL,
	"state" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "system_links_from_to_uq" UNIQUE("from_system_id","to_system_id"),
	CONSTRAINT "system_links_state_check" CHECK ("studio"."system_links"."state" in ('live', 'planned')),
	CONSTRAINT "system_links_label_not_blank" CHECK (length(trim("studio"."system_links"."label")) > 0),
	CONSTRAINT "system_links_not_self" CHECK ("studio"."system_links"."from_system_id" <> "studio"."system_links"."to_system_id")
);
--> statement-breakpoint
CREATE TABLE "studio"."system_resources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"system_id" text NOT NULL,
	"kind" text NOT NULL,
	"label" text NOT NULL,
	"url" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "system_resources_kind_check" CHECK ("studio"."system_resources"."kind" in ('repo', 'live', 'docs', 'board', 'other')),
	CONSTRAINT "system_resources_label_not_blank" CHECK (length(trim("studio"."system_resources"."label")) > 0),
	CONSTRAINT "system_resources_url_check" CHECK ("studio"."system_resources"."url" ~ '^https?://')
);
--> statement-breakpoint
CREATE TABLE "studio"."systems" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" uuid NOT NULL,
	"name" text NOT NULL,
	"status" text NOT NULL,
	"public_summary" text NOT NULL,
	"summary" text,
	"lessons" text,
	"stack" text[] DEFAULT '{}'::text[] NOT NULL,
	"standalone" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "systems_id_slug_check" CHECK ("studio"."systems"."id" ~ '^[a-z0-9-]+$'),
	CONSTRAINT "systems_status_check" CHECK ("studio"."systems"."status" in ('built', 'in-progress', 'next', 'planned')),
	CONSTRAINT "systems_name_not_blank" CHECK (length(trim("studio"."systems"."name")) > 0)
);
--> statement-breakpoint
ALTER TABLE "studio"."contacts" ADD CONSTRAINT "contacts_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "studio"."workspaces"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "studio"."contacts" ADD CONSTRAINT "contacts_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "studio"."clients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "studio"."contract_status_events" ADD CONSTRAINT "contract_status_events_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "studio"."workspaces"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "studio"."contract_status_events" ADD CONSTRAINT "contract_status_events_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "studio"."contracts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "studio"."contracts" ADD CONSTRAINT "contracts_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "studio"."workspaces"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "studio"."contracts" ADD CONSTRAINT "contracts_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "studio"."clients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "studio"."contracts" ADD CONSTRAINT "contracts_project_client_fk" FOREIGN KEY ("project_id","client_id") REFERENCES "studio"."projects"("id","client_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "studio"."notes" ADD CONSTRAINT "notes_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "studio"."workspaces"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "studio"."notes" ADD CONSTRAINT "notes_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "studio"."clients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "studio"."notes" ADD CONSTRAINT "notes_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "studio"."contacts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "studio"."notes" ADD CONSTRAINT "notes_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "studio"."projects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "studio"."notes" ADD CONSTRAINT "notes_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "studio"."contracts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "studio"."notes" ADD CONSTRAINT "notes_system_id_systems_id_fk" FOREIGN KEY ("system_id") REFERENCES "studio"."systems"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "studio"."project_systems" ADD CONSTRAINT "project_systems_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "studio"."workspaces"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "studio"."project_systems" ADD CONSTRAINT "project_systems_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "studio"."projects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "studio"."project_systems" ADD CONSTRAINT "project_systems_system_id_systems_id_fk" FOREIGN KEY ("system_id") REFERENCES "studio"."systems"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "studio"."projects" ADD CONSTRAINT "projects_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "studio"."workspaces"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "studio"."projects" ADD CONSTRAINT "projects_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "studio"."clients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "studio"."system_links" ADD CONSTRAINT "system_links_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "studio"."workspaces"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "studio"."system_links" ADD CONSTRAINT "system_links_from_system_id_systems_id_fk" FOREIGN KEY ("from_system_id") REFERENCES "studio"."systems"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "studio"."system_links" ADD CONSTRAINT "system_links_to_system_id_systems_id_fk" FOREIGN KEY ("to_system_id") REFERENCES "studio"."systems"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "studio"."system_resources" ADD CONSTRAINT "system_resources_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "studio"."workspaces"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "studio"."system_resources" ADD CONSTRAINT "system_resources_system_id_systems_id_fk" FOREIGN KEY ("system_id") REFERENCES "studio"."systems"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "studio"."systems" ADD CONSTRAINT "systems_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "studio"."workspaces"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "contacts_one_primary_uq" ON "studio"."contacts" USING btree ("client_id") WHERE "studio"."contacts"."is_primary" and "studio"."contacts"."archived_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "contacts_client_email_uq" ON "studio"."contacts" USING btree ("client_id",lower("email")) WHERE "studio"."contacts"."email" is not null and "studio"."contacts"."archived_at" is null;--> statement-breakpoint
CREATE INDEX "contacts_workspace_idx" ON "studio"."contacts" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "contacts_client_idx" ON "studio"."contacts" USING btree ("client_id");--> statement-breakpoint
CREATE UNIQUE INDEX "contract_status_events_one_opening_uq" ON "studio"."contract_status_events" USING btree ("contract_id") WHERE "studio"."contract_status_events"."from_status" is null;--> statement-breakpoint
CREATE INDEX "contract_status_events_contract_changed_idx" ON "studio"."contract_status_events" USING btree ("contract_id","changed_at");--> statement-breakpoint
CREATE INDEX "contract_status_events_workspace_idx" ON "studio"."contract_status_events" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "contracts_workspace_status_idx" ON "studio"."contracts" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE INDEX "contracts_client_idx" ON "studio"."contracts" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "contracts_project_idx" ON "studio"."contracts" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "notes_workspace_idx" ON "studio"."notes" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "notes_client_created_idx" ON "studio"."notes" USING btree ("client_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "notes_contact_created_idx" ON "studio"."notes" USING btree ("contact_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "notes_project_created_idx" ON "studio"."notes" USING btree ("project_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "notes_contract_created_idx" ON "studio"."notes" USING btree ("contract_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "notes_system_created_idx" ON "studio"."notes" USING btree ("system_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "project_systems_workspace_idx" ON "studio"."project_systems" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "project_systems_system_idx" ON "studio"."project_systems" USING btree ("system_id");--> statement-breakpoint
CREATE INDEX "projects_workspace_idx" ON "studio"."projects" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "projects_client_idx" ON "studio"."projects" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "system_links_workspace_idx" ON "studio"."system_links" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "system_links_to_idx" ON "studio"."system_links" USING btree ("to_system_id");--> statement-breakpoint
CREATE INDEX "system_resources_workspace_idx" ON "studio"."system_resources" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "system_resources_system_idx" ON "studio"."system_resources" USING btree ("system_id");--> statement-breakpoint
CREATE INDEX "systems_workspace_status_sort_idx" ON "studio"."systems" USING btree ("workspace_id","status","sort_order");
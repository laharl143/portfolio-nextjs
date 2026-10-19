CREATE TABLE "studio"."auth_challenges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"challenge" text NOT NULL,
	"purpose" text NOT NULL,
	"owner_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "auth_challenges_purpose_check" CHECK ("studio"."auth_challenges"."purpose" in ('register', 'authenticate'))
);
--> statement-breakpoint
CREATE TABLE "studio"."auth_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" text NOT NULL,
	"owner_id" uuid,
	"passkey_id" text,
	"device_label" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "auth_events_kind_check" CHECK ("studio"."auth_events"."kind" in ('sign_in', 'sign_in_failed', 'sign_out', 'sign_out_all', 'passkey_added', 'passkey_removed', 'passkey_renamed', 'setup_used', 'setup_rejected'))
);
--> statement-breakpoint
CREATE TABLE "studio"."owners" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"display_name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "owners_display_name_not_blank" CHECK (length(trim("studio"."owners"."display_name")) > 0)
);
--> statement-breakpoint
CREATE TABLE "studio"."passkeys" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" uuid NOT NULL,
	"public_key" text NOT NULL,
	"counter" bigint DEFAULT 0 NOT NULL,
	"transports" text[],
	"device_type" text NOT NULL,
	"backed_up" boolean NOT NULL,
	"nickname" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_used_at" timestamp with time zone,
	CONSTRAINT "passkeys_counter_not_negative" CHECK ("studio"."passkeys"."counter" >= 0),
	CONSTRAINT "passkeys_device_type_check" CHECK ("studio"."passkeys"."device_type" in ('singleDevice', 'multiDevice')),
	CONSTRAINT "passkeys_nickname_not_blank" CHECK (length(trim("studio"."passkeys"."nickname")) > 0)
);
--> statement-breakpoint
CREATE TABLE "studio"."sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token_hash" text NOT NULL,
	"owner_id" uuid NOT NULL,
	"workspace_id" uuid NOT NULL,
	"device_label" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "sessions_expires_after_created" CHECK ("studio"."sessions"."expires_at" > "studio"."sessions"."created_at")
);
--> statement-breakpoint
CREATE TABLE "studio"."workspace_members" (
	"workspace_id" uuid NOT NULL,
	"owner_id" uuid NOT NULL,
	"role" text DEFAULT 'owner' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workspace_members_pk" PRIMARY KEY("workspace_id","owner_id"),
	CONSTRAINT "workspace_members_role_check" CHECK ("studio"."workspace_members"."role" in ('owner'))
);
--> statement-breakpoint
ALTER TABLE "studio"."auth_challenges" ADD CONSTRAINT "auth_challenges_owner_id_owners_id_fk" FOREIGN KEY ("owner_id") REFERENCES "studio"."owners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "studio"."auth_events" ADD CONSTRAINT "auth_events_owner_id_owners_id_fk" FOREIGN KEY ("owner_id") REFERENCES "studio"."owners"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "studio"."passkeys" ADD CONSTRAINT "passkeys_owner_id_owners_id_fk" FOREIGN KEY ("owner_id") REFERENCES "studio"."owners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "studio"."sessions" ADD CONSTRAINT "sessions_membership_fk" FOREIGN KEY ("workspace_id","owner_id") REFERENCES "studio"."workspace_members"("workspace_id","owner_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "studio"."workspace_members" ADD CONSTRAINT "workspace_members_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "studio"."workspaces"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "studio"."workspace_members" ADD CONSTRAINT "workspace_members_owner_id_owners_id_fk" FOREIGN KEY ("owner_id") REFERENCES "studio"."owners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "auth_challenges_expires_idx" ON "studio"."auth_challenges" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "auth_events_created_idx" ON "studio"."auth_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "auth_events_kind_created_idx" ON "studio"."auth_events" USING btree ("kind","created_at");--> statement-breakpoint
CREATE INDEX "passkeys_owner_idx" ON "studio"."passkeys" USING btree ("owner_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sessions_token_hash_uq" ON "studio"."sessions" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "sessions_owner_idx" ON "studio"."sessions" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "sessions_expires_idx" ON "studio"."sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "workspace_members_owner_idx" ON "studio"."workspace_members" USING btree ("owner_id");--> statement-breakpoint
-- Spec 0005: the owner and their membership exist in every environment, production included, with no seed.
-- The id is STUDIO_OWNER_ID in src/studio/auth/config.ts; the workspace is STUDIO_WORKSPACE_ID from migration 0002.
INSERT INTO "studio"."owners" ("id", "display_name")
VALUES ('00000000-0000-4000-8000-000000000002', 'Erskine Duenas (studio)')
ON CONFLICT DO NOTHING;--> statement-breakpoint
INSERT INTO "studio"."workspace_members" ("workspace_id", "owner_id", "role")
VALUES ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002', 'owner')
ON CONFLICT DO NOTHING;

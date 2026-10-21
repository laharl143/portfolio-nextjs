CREATE TABLE "studio"."inquiries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"submission_key" uuid NOT NULL,
	"payload_hash" text NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"description" text NOT NULL,
	"company" text,
	"budget" text,
	"privacy_notice_version" text NOT NULL,
	"status" text DEFAULT 'new' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_activity_at" timestamp with time zone DEFAULT now() NOT NULL,
	"converted_at" timestamp with time zone,
	"conversion_key" uuid,
	"conversion_hash" text,
	"converted_client_id" uuid,
	"converted_contact_id" uuid,
	"converted_note_id" uuid,
	CONSTRAINT "inquiries_workspace_submission_uq" UNIQUE("workspace_id","submission_key"),
	CONSTRAINT "inquiries_status_check" CHECK ("studio"."inquiries"."status" in ('new','reviewing','converted','closed')),
	CONSTRAINT "inquiries_fields_check" CHECK (length(trim("studio"."inquiries"."name")) between 1 and 200 and length("studio"."inquiries"."email") between 1 and 320 and "studio"."inquiries"."email"=lower("studio"."inquiries"."email") and length(trim("studio"."inquiries"."description")) between 20 and 5000 and ("studio"."inquiries"."company" is null or length("studio"."inquiries"."company") <= 200) and ("studio"."inquiries"."budget" is null or length("studio"."inquiries"."budget") <= 200)),
	CONSTRAINT "inquiries_conversion_check" CHECK (("studio"."inquiries"."status"='converted' and num_nonnulls("studio"."inquiries"."converted_at","studio"."inquiries"."conversion_key","studio"."inquiries"."conversion_hash","studio"."inquiries"."converted_client_id","studio"."inquiries"."converted_contact_id")=5) or ("studio"."inquiries"."status"<>'converted' and num_nonnulls("studio"."inquiries"."converted_at","studio"."inquiries"."conversion_key","studio"."inquiries"."conversion_hash","studio"."inquiries"."converted_client_id","studio"."inquiries"."converted_contact_id","studio"."inquiries"."converted_note_id")=0))
);
--> statement-breakpoint
CREATE TABLE "studio"."inquiry_alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"inquiry_id" uuid NOT NULL,
	"state" text DEFAULT 'pending' NOT NULL,
	"generation" integer DEFAULT 1 NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"lease_id" uuid,
	"lease_expires_at" timestamp with time zone,
	"first_attempted_at" timestamp with time zone,
	"last_attempted_at" timestamp with time zone,
	"provider_message_id" text,
	"accepted_at" timestamp with time zone,
	"error_code" text,
	"sender" text,
	"recipient" text,
	"subject" text,
	"body" text,
	"provider_key" text,
	CONSTRAINT "inquiry_alerts_inquiry_uq" UNIQUE("inquiry_id"),
	CONSTRAINT "inquiry_alerts_state_check" CHECK ("studio"."inquiry_alerts"."state" in ('pending','sending','accepted','failed','unknown')),
	CONSTRAINT "inquiry_alerts_attempt_check" CHECK ("studio"."inquiry_alerts"."generation">0 and "studio"."inquiry_alerts"."attempt_count">=0)
);
--> statement-breakpoint
CREATE TABLE "studio"."inquiry_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"inquiry_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"actor_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inquiry_events_kind_check" CHECK ("studio"."inquiry_events"."kind" in ('submitted','reviewing','closed','reopened','converted','alert_retry'))
);
--> statement-breakpoint
CREATE TABLE "studio"."inquiry_maintenance" (
	"workspace_id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_success_at" timestamp with time zone,
	"deleted_inquiries" integer DEFAULT 0 NOT NULL,
	"deleted_rate_windows" integer DEFAULT 0 NOT NULL,
	"error_code" text,
	"outcome" text DEFAULT 'never' NOT NULL,
	CONSTRAINT "inquiry_maintenance_counts_check" CHECK ("studio"."inquiry_maintenance"."deleted_inquiries">=0 and "studio"."inquiry_maintenance"."deleted_rate_windows">=0),
	CONSTRAINT "inquiry_maintenance_outcome_check" CHECK ("studio"."inquiry_maintenance"."outcome" in ('never','complete','incomplete','failed'))
);
--> statement-breakpoint
CREATE TABLE "studio"."inquiry_rate_windows" (
	"workspace_id" uuid NOT NULL,
	"key_hash" text NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"count" integer NOT NULL,
	CONSTRAINT "inquiry_rate_windows_workspace_id_key_hash_window_start_pk" PRIMARY KEY("workspace_id","key_hash","window_start"),
	CONSTRAINT "inquiry_rate_count_check" CHECK ("studio"."inquiry_rate_windows"."count">0)
);
--> statement-breakpoint
ALTER TABLE "studio"."inquiries" ADD CONSTRAINT "inquiries_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "studio"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "studio"."inquiries" ADD CONSTRAINT "inquiries_converted_client_id_clients_id_fk" FOREIGN KEY ("converted_client_id") REFERENCES "studio"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "studio"."inquiries" ADD CONSTRAINT "inquiries_converted_contact_id_contacts_id_fk" FOREIGN KEY ("converted_contact_id") REFERENCES "studio"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "studio"."inquiries" ADD CONSTRAINT "inquiries_converted_note_id_notes_id_fk" FOREIGN KEY ("converted_note_id") REFERENCES "studio"."notes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "studio"."inquiry_alerts" ADD CONSTRAINT "inquiry_alerts_inquiry_id_inquiries_id_fk" FOREIGN KEY ("inquiry_id") REFERENCES "studio"."inquiries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "studio"."inquiry_events" ADD CONSTRAINT "inquiry_events_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "studio"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "studio"."inquiry_events" ADD CONSTRAINT "inquiry_events_inquiry_id_inquiries_id_fk" FOREIGN KEY ("inquiry_id") REFERENCES "studio"."inquiries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "studio"."inquiry_events" ADD CONSTRAINT "inquiry_events_actor_user_id_owners_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "studio"."owners"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "studio"."inquiry_maintenance" ADD CONSTRAINT "inquiry_maintenance_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "studio"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "studio"."inquiry_rate_windows" ADD CONSTRAINT "inquiry_rate_windows_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "studio"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "inquiries_inbox_idx" ON "studio"."inquiries" USING btree ("workspace_id","status","created_at","id");--> statement-breakpoint
CREATE INDEX "inquiries_activity_idx" ON "studio"."inquiries" USING btree ("workspace_id","last_activity_at");--> statement-breakpoint
CREATE INDEX "inquiries_converted_idx" ON "studio"."inquiries" USING btree ("workspace_id","converted_at");--> statement-breakpoint
CREATE INDEX "inquiry_events_inquiry_idx" ON "studio"."inquiry_events" USING btree ("inquiry_id");
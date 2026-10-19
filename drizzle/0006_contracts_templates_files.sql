CREATE TABLE "studio"."contract_files" (
	"id" uuid PRIMARY KEY NOT NULL,
	"workspace_id" uuid NOT NULL,
	"contract_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"status_event_id" uuid,
	"blob_pathname" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"sha256" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "contract_files_kind_check" CHECK ("studio"."contract_files"."kind" in ('sent_pdf', 'signed_copy')),
	CONSTRAINT "contract_files_size_positive" CHECK ("studio"."contract_files"."size_bytes" > 0),
	CONSTRAINT "contract_files_sha256_hex" CHECK ("studio"."contract_files"."sha256" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "contract_files_sent_pdf_has_event" CHECK ("studio"."contract_files"."kind" <> 'sent_pdf' or "studio"."contract_files"."status_event_id" is not null)
);
--> statement-breakpoint
CREATE TABLE "studio"."contract_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"body" text NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "contract_templates_name_not_blank" CHECK (length(trim("studio"."contract_templates"."name")) > 0),
	CONSTRAINT "contract_templates_body_length" CHECK (char_length("studio"."contract_templates"."body") <= 50000)
);
--> statement-breakpoint
ALTER TABLE "studio"."contracts" ADD COLUMN "template_id" uuid;--> statement-breakpoint
ALTER TABLE "studio"."contracts" ADD COLUMN "body" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "studio"."contract_files" ADD CONSTRAINT "contract_files_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "studio"."workspaces"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "studio"."contract_files" ADD CONSTRAINT "contract_files_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "studio"."contracts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "studio"."contract_files" ADD CONSTRAINT "contract_files_status_event_id_contract_status_events_id_fk" FOREIGN KEY ("status_event_id") REFERENCES "studio"."contract_status_events"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "studio"."contract_templates" ADD CONSTRAINT "contract_templates_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "studio"."workspaces"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "contract_files_blob_pathname_uq" ON "studio"."contract_files" USING btree ("blob_pathname");--> statement-breakpoint
CREATE UNIQUE INDEX "contract_files_status_event_uq" ON "studio"."contract_files" USING btree ("status_event_id") WHERE "studio"."contract_files"."status_event_id" is not null;--> statement-breakpoint
CREATE INDEX "contract_files_contract_kind_created_idx" ON "studio"."contract_files" USING btree ("contract_id","kind","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "contract_files_workspace_idx" ON "studio"."contract_files" USING btree ("workspace_id");--> statement-breakpoint
CREATE UNIQUE INDEX "contract_templates_workspace_name_uq" ON "studio"."contract_templates" USING btree ("workspace_id",lower("name")) WHERE "studio"."contract_templates"."archived_at" is null;--> statement-breakpoint
CREATE INDEX "contract_templates_workspace_updated_idx" ON "studio"."contract_templates" USING btree ("workspace_id","updated_at" DESC NULLS LAST);--> statement-breakpoint
ALTER TABLE "studio"."contracts" ADD CONSTRAINT "contracts_template_id_contract_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "studio"."contract_templates"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "studio"."contracts" ADD CONSTRAINT "contracts_body_length" CHECK (char_length("studio"."contracts"."body") <= 50000);
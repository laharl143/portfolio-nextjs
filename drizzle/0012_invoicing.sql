ALTER TABLE "studio"."contracts" ADD CONSTRAINT "contracts_id_client_uq" UNIQUE("id","client_id");--> statement-breakpoint
CREATE TABLE "studio"."billing_profiles" (
	"workspace_id" uuid PRIMARY KEY NOT NULL,
	"business_name" text NOT NULL,
	"address" text NOT NULL,
	"tin" text,
	"email" text,
	"phone" text,
	"payment_instructions" text NOT NULL,
	"tax_note" text,
	"document_title" text DEFAULT 'Invoice' NOT NULL,
	"default_payment_terms_days" smallint DEFAULT 15 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "billing_profiles_business_name_not_blank" CHECK (length(trim("studio"."billing_profiles"."business_name")) > 0),
	CONSTRAINT "billing_profiles_address_not_blank" CHECK (length(trim("studio"."billing_profiles"."address")) > 0),
	CONSTRAINT "billing_profiles_payment_instructions_not_blank" CHECK (length(trim("studio"."billing_profiles"."payment_instructions")) > 0),
	CONSTRAINT "billing_profiles_document_title_not_blank" CHECK (length(trim("studio"."billing_profiles"."document_title")) > 0),
	CONSTRAINT "billing_profiles_lengths" CHECK (("studio"."billing_profiles"."business_name" is null or char_length("studio"."billing_profiles"."business_name") <= 200) and ("studio"."billing_profiles"."address" is null or char_length("studio"."billing_profiles"."address") <= 1000) and ("studio"."billing_profiles"."tin" is null or char_length("studio"."billing_profiles"."tin") <= 30) and ("studio"."billing_profiles"."email" is null or char_length("studio"."billing_profiles"."email") <= 320) and ("studio"."billing_profiles"."phone" is null or char_length("studio"."billing_profiles"."phone") <= 50) and ("studio"."billing_profiles"."payment_instructions" is null or char_length("studio"."billing_profiles"."payment_instructions") <= 2000) and ("studio"."billing_profiles"."tax_note" is null or char_length("studio"."billing_profiles"."tax_note") <= 200) and ("studio"."billing_profiles"."document_title" is null or char_length("studio"."billing_profiles"."document_title") <= 60)),
	CONSTRAINT "billing_profiles_tin_format" CHECK ("studio"."billing_profiles"."tin" is null or "studio"."billing_profiles"."tin" ~ '^[0-9-]+$'),
	CONSTRAINT "billing_profiles_terms_range" CHECK ("studio"."billing_profiles"."default_payment_terms_days" between 0 and 365)
);
--> statement-breakpoint
CREATE TABLE "studio"."invoice_files" (
	"id" uuid PRIMARY KEY NOT NULL,
	"workspace_id" uuid NOT NULL,
	"invoice_id" uuid NOT NULL,
	"status_event_id" uuid NOT NULL,
	"blob_pathname" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"sha256" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invoice_files_size_positive" CHECK ("studio"."invoice_files"."size_bytes" > 0),
	CONSTRAINT "invoice_files_sha256_hex" CHECK ("studio"."invoice_files"."sha256" ~ '^[0-9a-f]{64}$')
);
--> statement-breakpoint
CREATE TABLE "studio"."invoice_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"invoice_id" uuid NOT NULL,
	"position" smallint NOT NULL,
	"description" text NOT NULL,
	"quantity_hundredths" integer NOT NULL,
	"unit_price_minor" bigint NOT NULL,
	"amount_minor" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invoice_lines_invoice_position_uq" UNIQUE("invoice_id","position"),
	CONSTRAINT "invoice_lines_position_range" CHECK ("studio"."invoice_lines"."position" between 1 and 50),
	CONSTRAINT "invoice_lines_description_not_blank" CHECK (length(trim("studio"."invoice_lines"."description")) > 0),
	CONSTRAINT "invoice_lines_description_length" CHECK (char_length("studio"."invoice_lines"."description") <= 500),
	CONSTRAINT "invoice_lines_quantity_range" CHECK ("studio"."invoice_lines"."quantity_hundredths" between 1 and 9999999),
	CONSTRAINT "invoice_lines_unit_price_range" CHECK ("studio"."invoice_lines"."unit_price_minor" between 0 and 999999999999),
	CONSTRAINT "invoice_lines_amount_range" CHECK ("studio"."invoice_lines"."amount_minor" between 0 and 999999999999),
	CONSTRAINT "invoice_lines_amount_rule" CHECK ("studio"."invoice_lines"."amount_minor" = floor(("studio"."invoice_lines"."quantity_hundredths"::numeric * "studio"."invoice_lines"."unit_price_minor" + 50) / 100)::bigint)
);
--> statement-breakpoint
CREATE TABLE "studio"."invoice_number_counters" (
	"workspace_id" uuid NOT NULL,
	"year" smallint NOT NULL,
	"last_number" integer NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invoice_number_counters_pk" PRIMARY KEY("workspace_id","year"),
	CONSTRAINT "invoice_number_counters_last_positive" CHECK ("studio"."invoice_number_counters"."last_number" >= 1),
	CONSTRAINT "invoice_number_counters_year_range" CHECK ("studio"."invoice_number_counters"."year" between 2000 and 9999)
);
--> statement-breakpoint
CREATE TABLE "studio"."invoice_status_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"invoice_id" uuid NOT NULL,
	"from_status" text,
	"to_status" text NOT NULL,
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invoice_status_events_from_status_check" CHECK ("studio"."invoice_status_events"."from_status" in ('draft', 'sent', 'paid', 'void')),
	CONSTRAINT "invoice_status_events_to_status_check" CHECK ("studio"."invoice_status_events"."to_status" in ('draft', 'sent', 'paid', 'void')),
	CONSTRAINT "invoice_status_events_opening_is_draft" CHECK ("studio"."invoice_status_events"."from_status" is not null or "studio"."invoice_status_events"."to_status" = 'draft'),
	CONSTRAINT "invoice_status_events_from_to_differ" CHECK ("studio"."invoice_status_events"."from_status" is distinct from "studio"."invoice_status_events"."to_status"),
	CONSTRAINT "invoice_status_events_note_length" CHECK ("studio"."invoice_status_events"."note" is null or char_length("studio"."invoice_status_events"."note") <= 1000)
);
--> statement-breakpoint
CREATE TABLE "studio"."invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"contract_id" uuid NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"number" text,
	"issued_on" date,
	"due_on" date,
	"payment_terms_days" smallint NOT NULL,
	"currency" text NOT NULL,
	"bill_to_address" text,
	"notes" text,
	"paid_on" date,
	"payment_method" text,
	"payment_reference" text,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invoices_status_check" CHECK ("studio"."invoices"."status" in ('draft', 'sent', 'paid', 'void')),
	CONSTRAINT "invoices_payment_method_check" CHECK ("studio"."invoices"."payment_method" in ('bank_transfer', 'gcash', 'maya', 'cash', 'check', 'other')),
	CONSTRAINT "invoices_number_iff_not_draft" CHECK (("studio"."invoices"."status" = 'draft') = ("studio"."invoices"."number" is null)),
	CONSTRAINT "invoices_dates_iff_number" CHECK (("studio"."invoices"."number" is null) = ("studio"."invoices"."issued_on" is null) and ("studio"."invoices"."number" is null) = ("studio"."invoices"."due_on" is null)),
	CONSTRAINT "invoices_number_format" CHECK ("studio"."invoices"."number" is null or "studio"."invoices"."number" ~ '^INV-[0-9]{4}-[0-9]{4,}$'),
	CONSTRAINT "invoices_due_after_issue" CHECK ("studio"."invoices"."due_on" is null or "studio"."invoices"."issued_on" is null or "studio"."invoices"."due_on" >= "studio"."invoices"."issued_on"),
	CONSTRAINT "invoices_paid_iff_paid_on" CHECK (("studio"."invoices"."status" = 'paid') = ("studio"."invoices"."paid_on" is not null)),
	CONSTRAINT "invoices_paid_after_issue" CHECK ("studio"."invoices"."paid_on" is null or "studio"."invoices"."issued_on" is null or "studio"."invoices"."paid_on" >= "studio"."invoices"."issued_on"),
	CONSTRAINT "invoices_payment_fields_only_when_paid" CHECK ("studio"."invoices"."status" = 'paid' or ("studio"."invoices"."payment_method" is null and "studio"."invoices"."payment_reference" is null)),
	CONSTRAINT "invoices_archived_only_draft" CHECK ("studio"."invoices"."archived_at" is null or "studio"."invoices"."status" = 'draft'),
	CONSTRAINT "invoices_terms_range" CHECK ("studio"."invoices"."payment_terms_days" between 0 and 365),
	CONSTRAINT "invoices_currency_check" CHECK ("studio"."invoices"."currency" ~ '^[A-Z]{3}$'),
	CONSTRAINT "invoices_lengths" CHECK (("studio"."invoices"."bill_to_address" is null or char_length("studio"."invoices"."bill_to_address") <= 1000) and ("studio"."invoices"."notes" is null or char_length("studio"."invoices"."notes") <= 2000) and ("studio"."invoices"."payment_reference" is null or char_length("studio"."invoices"."payment_reference") <= 200))
);
--> statement-breakpoint
ALTER TABLE "studio"."billing_profiles" ADD CONSTRAINT "billing_profiles_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "studio"."workspaces"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "studio"."invoice_files" ADD CONSTRAINT "invoice_files_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "studio"."workspaces"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "studio"."invoice_files" ADD CONSTRAINT "invoice_files_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "studio"."invoices"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "studio"."invoice_files" ADD CONSTRAINT "invoice_files_status_event_id_invoice_status_events_id_fk" FOREIGN KEY ("status_event_id") REFERENCES "studio"."invoice_status_events"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "studio"."invoice_lines" ADD CONSTRAINT "invoice_lines_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "studio"."workspaces"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "studio"."invoice_lines" ADD CONSTRAINT "invoice_lines_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "studio"."invoices"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "studio"."invoice_number_counters" ADD CONSTRAINT "invoice_number_counters_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "studio"."workspaces"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "studio"."invoice_status_events" ADD CONSTRAINT "invoice_status_events_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "studio"."workspaces"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "studio"."invoice_status_events" ADD CONSTRAINT "invoice_status_events_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "studio"."invoices"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "studio"."invoices" ADD CONSTRAINT "invoices_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "studio"."workspaces"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "studio"."invoices" ADD CONSTRAINT "invoices_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "studio"."clients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "studio"."invoices" ADD CONSTRAINT "invoices_contract_client_fk" FOREIGN KEY ("contract_id","client_id") REFERENCES "studio"."contracts"("id","client_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "invoice_files_invoice_uq" ON "studio"."invoice_files" USING btree ("invoice_id");--> statement-breakpoint
CREATE UNIQUE INDEX "invoice_files_status_event_uq" ON "studio"."invoice_files" USING btree ("status_event_id");--> statement-breakpoint
CREATE UNIQUE INDEX "invoice_files_blob_pathname_uq" ON "studio"."invoice_files" USING btree ("blob_pathname");--> statement-breakpoint
CREATE UNIQUE INDEX "invoice_status_events_one_opening_uq" ON "studio"."invoice_status_events" USING btree ("invoice_id") WHERE "studio"."invoice_status_events"."from_status" is null;--> statement-breakpoint
CREATE INDEX "invoice_status_events_invoice_changed_idx" ON "studio"."invoice_status_events" USING btree ("invoice_id","changed_at");--> statement-breakpoint
CREATE UNIQUE INDEX "invoices_workspace_number_uq" ON "studio"."invoices" USING btree ("workspace_id","number") WHERE "studio"."invoices"."number" is not null;--> statement-breakpoint
CREATE INDEX "invoices_workspace_status_due_idx" ON "studio"."invoices" USING btree ("workspace_id","status","due_on");--> statement-breakpoint
CREATE INDEX "invoices_contract_idx" ON "studio"."invoices" USING btree ("contract_id");--> statement-breakpoint
CREATE INDEX "invoices_client_idx" ON "studio"."invoices" USING btree ("client_id");

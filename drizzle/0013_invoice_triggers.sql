-- Spec 0013: invoice status history and frozen PDFs are append only, like their contract counterparts.
CREATE OR REPLACE FUNCTION "studio"."reject_invoice_append_only_change"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION '% is append only (% rejected)', TG_TABLE_NAME, TG_OP
    USING ERRCODE = 'restrict_violation';
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "invoice_status_events_append_only"
BEFORE UPDATE OR DELETE ON "studio"."invoice_status_events"
FOR EACH ROW EXECUTE FUNCTION "studio"."reject_invoice_append_only_change"();
--> statement-breakpoint
CREATE TRIGGER "invoice_files_append_only"
BEFORE UPDATE OR DELETE ON "studio"."invoice_files"
FOR EACH ROW EXECUTE FUNCTION "studio"."reject_invoice_append_only_change"();
--> statement-breakpoint
-- Lines change only while their invoice is a live draft (insert, update, or delete).
CREATE OR REPLACE FUNCTION "studio"."reject_invoice_line_change"() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  parent_id uuid;
  parent_status text;
  parent_archived timestamptz;
BEGIN
  IF TG_OP = 'DELETE' THEN
    parent_id := OLD.invoice_id;
  ELSE
    parent_id := NEW.invoice_id;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.invoice_id IS DISTINCT FROM NEW.invoice_id THEN
    RAISE EXCEPTION 'invoice_lines cannot move between invoices'
      USING ERRCODE = 'restrict_violation';
  END IF;
  SELECT status, archived_at INTO parent_status, parent_archived
    FROM "studio"."invoices" WHERE id = parent_id;
  IF parent_status IS DISTINCT FROM 'draft' OR parent_archived IS NOT NULL THEN
    RAISE EXCEPTION 'invoice_lines of a % invoice cannot change (% rejected)', coalesce(parent_status, 'missing'), TG_OP
      USING ERRCODE = 'restrict_violation';
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "invoice_lines_draft_only"
BEFORE INSERT OR UPDATE OR DELETE ON "studio"."invoice_lines"
FOR EACH ROW EXECUTE FUNCTION "studio"."reject_invoice_line_change"();
--> statement-breakpoint
-- A sent invoice keeps its number, dates, and billed details; only status, payment columns, archived_at, and
-- updated_at stay writable for the steps. Invoices are never deleted.
CREATE OR REPLACE FUNCTION "studio"."reject_invoice_frozen_change"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'invoices are never deleted'
      USING ERRCODE = 'restrict_violation';
  END IF;
  IF OLD.status <> 'draft' AND (
    NEW.number IS DISTINCT FROM OLD.number OR
    NEW.issued_on IS DISTINCT FROM OLD.issued_on OR
    NEW.due_on IS DISTINCT FROM OLD.due_on OR
    NEW.currency IS DISTINCT FROM OLD.currency OR
    NEW.payment_terms_days IS DISTINCT FROM OLD.payment_terms_days OR
    NEW.bill_to_address IS DISTINCT FROM OLD.bill_to_address OR
    NEW.notes IS DISTINCT FROM OLD.notes OR
    NEW.client_id IS DISTINCT FROM OLD.client_id OR
    NEW.contract_id IS DISTINCT FROM OLD.contract_id
  ) THEN
    RAISE EXCEPTION 'a % invoice cannot change its frozen fields', OLD.status
      USING ERRCODE = 'restrict_violation';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "invoice_frozen_fields"
BEFORE UPDATE OR DELETE ON "studio"."invoices"
FOR EACH ROW EXECUTE FUNCTION "studio"."reject_invoice_frozen_change"();

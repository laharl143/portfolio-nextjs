-- Spec 0004, AC-6: contract status history is append only. Any update or delete is rejected.
CREATE OR REPLACE FUNCTION "studio"."reject_contract_status_event_change"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'contract_status_events is append only (% rejected)', TG_OP
    USING ERRCODE = 'restrict_violation';
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "contract_status_events_append_only"
BEFORE UPDATE OR DELETE ON "studio"."contract_status_events"
FOR EACH ROW EXECUTE FUNCTION "studio"."reject_contract_status_event_change"();

-- Spec 0007: contract files are append only, like contract_status_events. Any update or delete is rejected.
CREATE OR REPLACE FUNCTION "studio"."reject_contract_file_change"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'contract_files is append only (% rejected)', TG_OP
    USING ERRCODE = 'restrict_violation';
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "contract_files_append_only"
BEFORE UPDATE OR DELETE ON "studio"."contract_files"
FOR EACH ROW EXECUTE FUNCTION "studio"."reject_contract_file_change"();

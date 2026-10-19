-- Spec 0008: a private layer per system (standalone derived from it) and a published flag. Additive: add with
-- defaults, backfill, then the checks. Every existing row came from the public file, so all start published.
ALTER TABLE "studio"."systems" ADD COLUMN "layer" text DEFAULT 'core' NOT NULL;--> statement-breakpoint
ALTER TABLE "studio"."systems" ADD COLUMN "published" boolean DEFAULT false NOT NULL;--> statement-breakpoint
UPDATE "studio"."systems" SET "layer" = 'standalone' WHERE "standalone";--> statement-breakpoint
UPDATE "studio"."systems" SET "published" = true;--> statement-breakpoint
ALTER TABLE "studio"."systems" ADD CONSTRAINT "systems_layer_check" CHECK ("studio"."systems"."layer" in ('current', 'platform', 'core', 'layer2', 'standalone'));--> statement-breakpoint
ALTER TABLE "studio"."systems" ADD CONSTRAINT "systems_standalone_matches_layer" CHECK ("studio"."systems"."standalone" = ("studio"."systems"."layer" = 'standalone'));

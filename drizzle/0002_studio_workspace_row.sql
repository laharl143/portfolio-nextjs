-- Spec 0004, AC-2: the owner's workspace exists in every environment, production included, with no seed.
-- The id is STUDIO_WORKSPACE_ID in src/studio/data/workspace.ts.
INSERT INTO "studio"."workspaces" ("id", "name", "slug")
VALUES ('00000000-0000-4000-8000-000000000001', 'ED Studio', 'ed-studio')
ON CONFLICT DO NOTHING;

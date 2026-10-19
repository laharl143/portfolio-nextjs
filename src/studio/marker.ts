import "server-only";

// The leak check (scripts/check-studio-leak.mjs) fails the build if this string shows up in public output (spec 0003, AC-5).
export const STUDIO_SERVER_MARKER = "__ed_studio_server_only__";

// A side effect, so the bundler keeps the string in every chunk that imports this module.
(globalThis as { __edStudioServerMarker?: string }).__edStudioServerMarker = STUDIO_SERVER_MARKER;

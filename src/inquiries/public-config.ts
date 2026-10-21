// Safe for public pages: never imports the database or the studio.
export function getPublicIntakeConfig() {
  const allowed =
    process.env.VERCEL_ENV === "production" ||
    (!process.env.VERCEL_ENV && process.env.NODE_ENV !== "production");
  const enabled = allowed && process.env.LEAD_INTAKE_ENABLED === "true";
  return {
    enabled,
    siteKey: enabled ? (process.env.TURNSTILE_SITE_KEY ?? "") : "",
  };
}

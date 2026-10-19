/** @type {import('next').NextConfig} */
const nextConfig = {
  // Next logs each Server Function call with its arguments in dev. Studio actions receive their previous state,
  // which echoes typed contact details, so that log stays off (spec 0006, AC-11).
  logging: { serverFunctions: false },
  // @react-pdf/renderer is already on Next's default server external list. The contract PDF fonts are read from
  // disk at runtime, so they are traced into every studio route's server output (spec 0007, PDF rendering).
  outputFileTracingIncludes: {
    "/studio/**": ["./src/studio/contracts/pdf/fonts/**"],
  },
  experimental: {
    // Signed copy uploads are capped at 4 MB, under Vercel's 4.5 MB request limit (spec 0007, AC-8).
    serverActions: { bodySizeLimit: "4.5mb" },
  },
};

export default nextConfig;

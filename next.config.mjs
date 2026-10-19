/** @type {import('next').NextConfig} */
const nextConfig = {
  // Next logs each Server Function call with its arguments in dev. Studio actions receive their previous state,
  // which echoes typed contact details, so that log stays off (spec 0006, AC-11).
  logging: { serverFunctions: false },
};

export default nextConfig;

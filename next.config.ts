import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Port configuration is handled via CLI flags or environment variables
  // Default port can be overridden with --port flag or PORT environment variable
  eslint: {
    // Enable ESLint validation during builds for clean code
    ignoreDuringBuilds: false,
  },
  typescript: {
    // Enable TypeScript validation during builds for type safety
    ignoreBuildErrors: false,
  },
};

export default nextConfig;

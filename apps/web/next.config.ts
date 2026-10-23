import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  cacheComponents: true,
  partialPrefetching: true,
  // Paquetes del monorepo consumidos como fuente TypeScript.
  transpilePackages: [
    "@opai/ds",
    "@opai/capabilities",
    "@opai/db",
    "@opai/domain",
    "@opai/modules",
  ],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;

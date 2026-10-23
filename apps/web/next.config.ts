import { existsSync } from "node:fs";

import type { NextConfig } from "next";

// En desarrollo las variables viven en `.env.local` de la raíz del monorepo (una sola copia).
// No reemplaza variables ya definidas; en Vercel el archivo no existe.
const envRaiz = new URL("../../.env.local", import.meta.url);
if (existsSync(envRaiz)) process.loadEnvFile(envRaiz);

/** Cabeceras de seguridad (Brief 01). La CSP llega en un brief posterior. */
const cabeceras = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Content-Type-Options", value: "nosniff" },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  cacheComponents: true,
  partialPrefetching: true,
  // Presupuesto de JS (ADR-037): el barrel del DS se resuelve a sus módulos para que cada ruta
  // cargue solo los componentes que usa.
  experimental: { optimizePackageImports: ["@opai/ds"] },
  // Paquetes del monorepo consumidos como fuente TypeScript.
  transpilePackages: [
    "@opai/ds",
    "@opai/auth",
    "@opai/capabilities",
    "@opai/db",
    "@opai/domain",
    "@opai/integrations",
    "@opai/modules",
  ],
  async headers() {
    return [{ source: "/:path*", headers: cabeceras }];
  },
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

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
  // cargue solo los componentes que usa. staleTimes: lo ya visitado se muestra al instante durante
  // 5 min y se refresca en segundo plano (`RefrescoSilencioso`); las escrituras desde la UI y los
  // cambios de empresa o sesión vacían la caché.
  experimental: {
    optimizePackageImports: ["@opai/ds"],
    staleTimes: { dynamic: 300, static: 300 },
  },
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
  // `/personas/nueva` abierto a mano se leía como el id "nueva": las altas viven en la lista
  // (`?nueva=1`, `?nuevo=1`), así que estas rutas llevan al formulario.
  async redirects() {
    return [
      { source: "/personas/nueva", destination: "/personas?nueva=1", permanent: false },
      { source: "/cuentas/nueva", destination: "/cuentas?nueva=1", permanent: false },
      { source: "/cargos/nuevo", destination: "/cargos?nuevo=1", permanent: false },
      { source: "/cargos/nueva", destination: "/cargos?nuevo=1", permanent: false },
      // Vencimientos es una pestaña de Personas (NAVEGACION.md); la ruta corta lleva allí.
      { source: "/vencimientos", destination: "/personas/vencimientos", permanent: false },
      // "Cargos y sueldos" ya no es pestaña de Personas: vive solo en el menú lateral (Maestros).
      // Las rutas que alguna vez apuntaron a esas pestañas llevan a su sitio en vez de leerse como un id.
      { source: "/personas/cargos", destination: "/cargos", permanent: false },
      { source: "/personas/cargos-y-sueldos", destination: "/cargos", permanent: false },
      { source: "/cargos/personas", destination: "/personas", permanent: false },
      { source: "/cargos/vencimientos", destination: "/personas/vencimientos", permanent: false },
    ];
  },
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

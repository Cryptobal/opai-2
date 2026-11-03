import { existsSync } from "node:fs";

import type { NextConfig } from "next";

import { cabecerasSeguridad } from "./lib/cabeceras-seguridad";
import { CACHE_DINAMICA_S } from "./lib/cache-navegador";

// En desarrollo las variables viven en `.env.local` de la raíz del monorepo (una sola copia).
// No reemplaza variables ya definidas; en Vercel el archivo no existe.
const envRaiz = new URL("../../.env.local", import.meta.url);
if (existsSync(envRaiz)) process.loadEnvFile(envRaiz);

// Cabeceras de seguridad para todas las rutas (núcleo P1): CSP en enforcement (CAR-57),
// HSTS en producción y Permissions-Policy, además de X-Frame-Options/Referrer/Content-Type.
const produccion = process.env.NODE_ENV === "production";
const cabeceras = cabecerasSeguridad({ produccion, desarrollo: !produccion });

const nextConfig: NextConfig = {
  reactStrictMode: true,
  cacheComponents: true,
  partialPrefetching: true,
  // Presupuesto de JS (ADR-037): el barrel del DS se resuelve a sus módulos para que cada ruta
  // cargue solo los componentes que usa. staleTimes (ADR-045): lo ya visitado se muestra al instante
  // durante CACHE_DINAMICA_S (30 s, `lib/cache-navegador.ts`) y se refresca en segundo plano (`useRefrescoSilencioso`); las escrituras desde la
  // UI, el cambio de empresa y la sesión vacían la caché.
  experimental: {
    optimizePackageImports: ["@opai/ds"],
    staleTimes: { dynamic: CACHE_DINAMICA_S, static: CACHE_DINAMICA_S },
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
      { source: "/nomina", destination: "/remuneraciones", permanent: false },
      { source: "/nomina/:path*", destination: "/remuneraciones/:path*", permanent: false },
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

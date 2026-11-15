import type { CapacitorConfig } from "@capacitor/cli";

/**
 * La app nativa «OPAI» (Brief 17, ADR-044.8 con sus adendas de CAR-90). Es un contenedor de Capacitor
 * que carga la misma app web desplegada: no hay una copia del código web en el teléfono. Cada persona
 * entra por `/entrar`, que la lleva a su portal según su membresía (o a Terreno si el equipo está
 * emparejado). Se publica una sola app en las tiendas (decisión de Carlos, 14-nov-2026, CAR-495).
 */

/** Dónde vive la app web. `produccion` solo se usa al preparar una versión para tiendas. */
export const ENTORNOS = {
  test: "https://test.opai.cl",
  produccion: "https://app.opai.cl",
} as const;

type Entorno = keyof typeof ENTORNOS;

/** Ruta con que abre la app: la entrada única de la PWA (ADR-044.1). */
const RUTA_ENTRADA = "/entrar";

function esEntorno(valor: string): valor is Entorno {
  return Object.hasOwn(ENTORNOS, valor);
}

/** Lee el entorno de `OPAI_APP_ENTORNO`; por defecto, test. */
export function elegirEntorno(env: Record<string, string | undefined>): Entorno {
  const entorno = env["OPAI_APP_ENTORNO"] ?? "test";
  if (!esEntorno(entorno))
    throw new Error(`OPAI_APP_ENTORNO desconocido: ${entorno} (test o produccion)`);
  return entorno;
}

/**
 * Configuración de Capacitor para un entorno. La app solo navega dentro del dominio de OPAI de ese
 * entorno: cualquier otro enlace se abre en el navegador del sistema. Sin tráfico en claro.
 */
export function configuracion(entorno: Entorno): CapacitorConfig {
  const origen = new URL(ENTORNOS[entorno]);
  return {
    appId: "cl.opai.app",
    appName: "OPAI",
    webDir: "www",
    android: { path: "nativo/android", allowMixedContent: false },
    ios: { path: "nativo/ios", contentInset: "never" },
    appendUserAgent: "OPAIApp/opai",
    server: {
      url: new URL(RUTA_ENTRADA, origen).toString(),
      cleartext: false,
      allowNavigation: [origen.hostname],
      errorPath: "sin-conexion.html",
    },
  };
}

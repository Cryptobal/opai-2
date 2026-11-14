import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Las apps nativas de OPAI (Brief 17, ADR-044.8 con la adenda de CAR-90). Son contenedores de Capacitor
 * que cargan la misma app web desplegada: no hay una copia del código web en el teléfono. Cada persona
 * entra por `/entrar`, que la lleva a su portal según su membresía (o a Terreno si el equipo está
 * emparejado). Las dos variantes solo cambian el nombre, el identificador de tienda y la carpeta nativa.
 */
export const VARIANTES = {
  opai: { appId: "cl.opai.app", appName: "OPAI", carpeta: "nativo/opai" },
  terreno: { appId: "cl.opai.terreno", appName: "OPAI Terreno", carpeta: "nativo/terreno" },
} as const;

/** Dónde vive la app web. `produccion` solo se usa al preparar una versión para tiendas. */
export const ENTORNOS = {
  test: "https://test.opai.cl",
  produccion: "https://app.opai.cl",
} as const;

export type Variante = keyof typeof VARIANTES;
export type Entorno = keyof typeof ENTORNOS;

/** Ruta con que abre la app: la entrada única de la PWA (ADR-044.1). */
const RUTA_ENTRADA = "/entrar";

function esVariante(valor: string): valor is Variante {
  return Object.hasOwn(VARIANTES, valor);
}

function esEntorno(valor: string): valor is Entorno {
  return Object.hasOwn(ENTORNOS, valor);
}

/** Lee la variante y el entorno de las variables `OPAI_APP` y `OPAI_APP_ENTORNO`; por defecto, OPAI en test. */
export function elegir(env: Record<string, string | undefined>): {
  variante: Variante;
  entorno: Entorno;
} {
  const variante = env["OPAI_APP"] ?? "opai";
  const entorno = env["OPAI_APP_ENTORNO"] ?? "test";
  if (!esVariante(variante)) throw new Error(`OPAI_APP desconocida: ${variante} (opai o terreno)`);
  if (!esEntorno(entorno))
    throw new Error(`OPAI_APP_ENTORNO desconocido: ${entorno} (test o produccion)`);
  return { variante, entorno };
}

/**
 * Configuración de Capacitor para una variante y un entorno. La app solo navega dentro del dominio de
 * OPAI de ese entorno: cualquier otro enlace se abre en el navegador del sistema. Sin tráfico en claro.
 */
export function configuracion(variante: Variante, entorno: Entorno): CapacitorConfig {
  const { appId, appName, carpeta } = VARIANTES[variante];
  const origen = new URL(ENTORNOS[entorno]);
  return {
    appId,
    appName,
    webDir: "www",
    android: { path: `${carpeta}/android`, allowMixedContent: false },
    ios: { path: `${carpeta}/ios`, contentInset: "never" },
    appendUserAgent: `OPAIApp/${variante}`,
    server: {
      url: new URL(RUTA_ENTRADA, origen).toString(),
      cleartext: false,
      allowNavigation: [origen.hostname],
      errorPath: "sin-conexion.html",
    },
  };
}

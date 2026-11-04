import { readFile } from "node:fs/promises";

import type { DatosOpai1 } from "./origen";
import { datosOpai1 } from "./origen";

/** Fuente de las filas de 1.0. La simulación y la carga real usan la misma interfaz. */
export interface LectorOrigen {
  readonly descripcion: string;
  leer(): Promise<DatosOpai1>;
}

/** Valida un objeto ya parseado. El error nombra solo rutas y tipos, nunca valores (Ley 21.719). */
export function validarDatos(crudo: unknown): DatosOpai1 {
  const r = datosOpai1.safeParse(crudo);
  if (r.success) return r.data;
  const rutas = r.error.issues.slice(0, 10).map((i) => `${i.path.join(".")} (${i.code})`);
  throw new Error(`Origen inválido: ${rutas.join("; ")}`);
}

/** Fixtures JSON locales (datos ficticios). */
export function lectorFixtures(ruta: string): LectorOrigen {
  return {
    descripcion: "fixtures",
    async leer() {
      let crudo: unknown;
      try {
        crudo = JSON.parse(await readFile(ruta, "utf8"));
      } catch {
        throw new Error("JSON inválido en el origen.");
      }
      return validarDatos(crudo);
    },
  };
}

export { lectorApiOpai1, lectorContratoFixtures } from "./origen-api";

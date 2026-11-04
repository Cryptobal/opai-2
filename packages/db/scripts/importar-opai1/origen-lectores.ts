import { readFile } from "node:fs/promises";

import type { DatosOpai1 } from "./origen";
import { validarTolerante } from "./origen-tolerante";

/** Fuente de las filas de 1.0. La simulación y la carga real usan la misma interfaz. */
export interface LectorOrigen {
  readonly descripcion: string;
  leer(): Promise<DatosOpai1>;
}

/** Valida un objeto ya parseado, sin detenerse por datos malos (ver `origen-tolerante.ts`). Nunca muestra valores. */
export function validarDatos(crudo: unknown): DatosOpai1 {
  return validarTolerante(crudo);
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

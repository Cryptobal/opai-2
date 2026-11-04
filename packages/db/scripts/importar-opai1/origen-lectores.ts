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
  // Agrupa por campo (índices → N) con filas afectadas y la primera fila, para ver todo de una vez.
  const grupos = new Map<string, { n: number; primera: string }>();
  for (const i of r.error.issues) {
    const clave = `${i.path.map((x) => (typeof x === "number" ? "N" : x)).join(".")} (${i.code})`;
    const g = grupos.get(clave) ?? { n: 0, primera: i.path.join(".") };
    g.n += 1;
    grupos.set(clave, g);
  }
  const rutas = [...grupos].slice(0, 40).map(([k, g]) => (g.n > 1 ? `${k} ×${g.n}, p. ej. ${g.primera}` : g.primera + k.slice(k.indexOf(" ("))));
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

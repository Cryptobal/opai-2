import { esVertical, vocabulario, type Vocabulario } from "@opai/domain";

import { identidadActual } from "./servidor";

const mayuscula = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Vocabulario de la vertical del tenant actual ("Guardias", "Faenas"…), para títulos visibles. */
export async function vocabularioActual(): Promise<
  Vocabulario & { titulo: (t: "persona" | "instalacion") => string }
> {
  const v = (await identidadActual())?.actual?.tenant.vertical ?? "";
  const voc = vocabulario(esVertical(v) ? v : "seguridad");
  return { ...voc, titulo: (t) => mayuscula(voc[t].plural) };
}

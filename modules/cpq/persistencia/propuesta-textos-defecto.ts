import type { Contexto } from "@opai/capabilities";

import type { BloqueArmadorPropuesta } from "../domain/documento/propuesta-tecnica";
import { vistaMarcaDocumento } from "./marca-documento";
import { textosBiblioteca } from "./pdf-propuesta-biblioteca";

/**
 * Texto que sale en cada sección mientras nadie escriba uno propio, por id de bloque: el texto tipo de la biblioteca o,
 * en condiciones, las de la marca. Es lo mismo que usa el documento (`html-secciones.ts`).
 */
export async function textosPorDefecto(
  ctx: Contexto,
  bloques: readonly BloqueArmadorPropuesta[],
): Promise<Record<string, string>> {
  const biblioteca = await textosBiblioteca(ctx, JSON.stringify(bloques));
  const condiciones = bloques.some((b) => b.tipo === "condiciones")
    ? ((await vistaMarcaDocumento(ctx)).condicionesDefault ?? "").trim()
    : "";
  const salida: Record<string, string> = {};
  for (const b of bloques) {
    const texto = (b.bibliotecaClave ? biblioteca[b.bibliotecaClave] : "") || (b.tipo === "condiciones" ? condiciones : "");
    if (texto) salida[b.id] = texto;
  }
  return salida;
}

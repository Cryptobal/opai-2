import type { Contexto } from "@opai/capabilities";

import { parseBloquesArmadorPropuesta } from "../domain/documento/propuesta-tecnica";

/** Versiones de biblioteca congeladas para los bloques de la propuesta en un envío. */
export async function bibliotecaDeBloquesEnvio(
  ctx: Contexto,
  propuestaBloquesJson: string,
): Promise<Record<string, number>> {
  const bloques = parseBloquesArmadorPropuesta(propuestaBloquesJson);
  const claves = [...new Set(bloques.map((b) => b.bibliotecaClave).filter((c): c is string => Boolean(c?.trim())))];
  if (!claves.length) return {};
  const rows = await ctx.db.cpqBibliotecaBloque.findMany({
    where: { tenantId: ctx.tenantId, clave: { in: claves } },
    select: { clave: true, versionPublicada: true },
  });
  return Object.fromEntries(rows.map((r) => [r.clave, r.versionPublicada]));
}
import type { Contexto } from "@opai/capabilities";

import { parseBloquesArmadorPropuesta } from "../domain/documento/propuesta-tecnica";

/** Texto plano de un `contenidoJson` de biblioteca: cadena, `{ texto }` o `{ parrafos: [] }`; texto sin JSON se usa tal cual. */
export function textoDeContenido(contenidoJson: string): string {
  let v: unknown;
  try {
    v = JSON.parse(contenidoJson);
  } catch {
    return contenidoJson.trim();
  }
  if (typeof v === "string") return v.trim();
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    if (typeof o["texto"] === "string") return o["texto"].trim();
    if (Array.isArray(o["parrafos"]))
      return o["parrafos"]
        .filter((p): p is string => typeof p === "string")
        .join("\n")
        .trim();
  }
  return "";
}

/** Texto de cada bloque de biblioteca usado por la propuesta, en la versión congelada del envío (o la publicada). */
export async function textosBiblioteca(
  ctx: Contexto,
  bloquesJson: string,
  versiones: Readonly<Record<string, number>> = {},
): Promise<Record<string, string>> {
  const claves = [
    ...new Set(
      parseBloquesArmadorPropuesta(bloquesJson)
        .map((b) => b.bibliotecaClave?.trim())
        .filter((c): c is string => Boolean(c)),
    ),
  ];
  const salida: Record<string, string> = {};
  for (const clave of claves) {
    const bloque = await ctx.db.cpqBibliotecaBloque.findFirst({ where: { clave } });
    if (!bloque) continue;
    const version = versiones[clave] ?? bloque.versionPublicada;
    const rev =
      version > 0
        ? await ctx.db.cpqBibliotecaBloqueRevision.findFirst({
            where: { bloqueId: bloque.id, version },
          })
        : null;
    const texto = rev
      ? textoDeContenido(rev.contenidoJson)
      : bloque.estado === "publicado"
        ? textoDeContenido(bloque.contenidoJson)
        : "";
    if (texto) salida[clave] = texto;
  }
  return salida;
}

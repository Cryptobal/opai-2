import { z } from "zod";

import { type Contexto, noEncontrado, reglaDeNegocio } from "@opai/capabilities";

/** Cursor y límite de las listas propias del portal (documentos, solicitudes). */
export const inputPaginaPropia = (cursor: string) => ({
  cursor: z.uuid().optional().describe(cursor),
  limite: z.number().int().min(1).max(100).default(50),
});

/** Tramo de la consulta de una página por cursor: una fila de más para saber si hay siguiente. */
export const tramoPagina = (input: { cursor?: string | undefined; limite: number }) => ({
  take: input.limite + 1,
  ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
});

/** Página pedida con `tramoPagina`: la fila de más solo indica que hay siguiente. */
export function cortarPagina<T extends { id: string }>(filas: T[], limite: number) {
  const pagina = filas.slice(0, limite);
  return { pagina, siguiente: filas.length > limite ? (pagina.at(-1)?.id ?? null) : null };
}

/** Usuario detrás de la ejecución: el propio usuario o el responsable de la API key (ADR-033). */
export function usuarioDe(ctx: Contexto): string {
  if (ctx.actor.tipo === "user") return ctx.actor.id;
  if (ctx.actor.tipo === "agent") return ctx.actor.viaUserId;
  throw reglaDeNegocio("Esta acción requiere un usuario responsable.");
}

/**
 * La persona vinculada al usuario por `core.personas.usuario_id` en esta empresa (alcance del portal,
 * ADR-022). Es la ÚNICA persona que estas capacidades pueden leer o editar: ningún input trae un id
 * de persona. Una ficha archivada o anonimizada responde como inexistente.
 */
export async function personaPropia(ctx: Contexto) {
  const porPersona = ctx.verComo?.personaId;
  const p = await ctx.db.persona.findFirst({
    where: porPersona
      ? { id: porPersona, archivadaEn: null, anonimizadaEn: null }
      : { usuarioId: usuarioDe(ctx), archivadaEn: null, anonimizadaEn: null },
  });
  if (!p) throw noEncontrado("Tu ficha de persona");
  return p;
}

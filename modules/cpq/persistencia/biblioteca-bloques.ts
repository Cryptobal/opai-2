import type { Contexto } from "@opai/capabilities";
import { reglaDeNegocio, uuid7, idAutor } from "@opai/capabilities";
import { NOMBRES_BLOQUE_PROPUESTA, tieneTextoTipo } from "@opai/domain";

import type { BloqueArmadorPropuesta } from "../domain/documento/propuesta-tecnica";

type Tx = Parameters<Parameters<Contexto["transaccion"]>[0]>[0];
type FilaBloque = { id: string; versionPublicada: number; contenidoJson: string };

/** Nueva versión publicada con el contenido actual del bloque (revisión inmutable). */
async function publicarEn(tx: Tx, ctx: Contexto, row: FilaBloque, actorId: string) {
  const version = row.versionPublicada + 1;
  await tx.cpqBibliotecaBloqueRevision.create({
    data: { id: uuid7(), tenantId: ctx.tenantId, bloqueId: row.id, version, contenidoJson: row.contenidoJson, creadoPorId: actorId },
  });
  return tx.cpqBibliotecaBloque.update({
    where: { id: row.id },
    data: { estado: "publicado", versionPublicada: version, publicadoPorId: actorId, publicadoEn: new Date() },
  });
}

export async function publicarBloqueBiblioteca(ctx: Contexto, bloqueId: string, escribir: boolean) {
  const row = await ctx.db.cpqBibliotecaBloque.findFirst({ where: { id: bloqueId } });
  if (!row) throw reglaDeNegocio("Bloque no encontrado.");
  if (!escribir) return { ...row, versionPublicada: row.versionPublicada + 1, estado: "publicado" as const };
  const actorId = idAutor(ctx.actor) ?? row.creadoPorId;
  return ctx.transaccion((tx) => publicarEn(tx, ctx, row, actorId));
}

/**
 * Texto tipo de la empresa para un tipo de sección: el bloque de biblioteca con clave igual al tipo, guardado y
 * publicado en una versión nueva. Las propuestas ya enviadas conservan la versión que congelaron.
 */
export async function guardarTextoTipo(ctx: Contexto, tipo: string, texto: string, escribir: boolean) {
  if (!tieneTextoTipo(tipo)) throw reglaDeNegocio("Esta sección no tiene texto tipo.");
  const actorId = idAutor(ctx.actor);
  if (!actorId) throw reglaDeNegocio("El texto tipo lo guarda una persona de la empresa.");
  const contenidoJson = JSON.stringify({ texto: texto.trim() });
  const previo = await ctx.db.cpqBibliotecaBloque.findFirst({ where: { clave: tipo } });
  if (!escribir) return { id: previo?.id ?? "00000000-0000-0000-0000-000000000000", versionPublicada: (previo?.versionPublicada ?? 0) + 1 };
  return ctx.transaccion(async (tx) => {
    const row = await tx.cpqBibliotecaBloque.upsert({
      where: { tenantId_clave: { tenantId: ctx.tenantId, clave: tipo } },
      update: { contenidoJson },
      create: { id: uuid7(), tenantId: ctx.tenantId, clave: tipo, tipo, titulo: NOMBRES_BLOQUE_PROPUESTA[tipo] ?? tipo, contenidoJson, creadoPorId: actorId },
    });
    return publicarEn(tx, ctx, row, actorId);
  });
}

/** Bloques nuevos de una propuesta: cada sección con texto tipo publicado lo trae, sin que nadie lo elija. */
export async function conTextosTipo(ctx: Contexto, bloques: BloqueArmadorPropuesta[]): Promise<BloqueArmadorPropuesta[]> {
  const tipos = bloques.filter((b) => !b.bibliotecaClave && tieneTextoTipo(b.tipo)).map((b) => b.tipo);
  if (!tipos.length) return bloques;
  const publicados = await ctx.db.cpqBibliotecaBloque.findMany({
    where: { clave: { in: tipos }, estado: "publicado" },
    select: { clave: true },
  });
  const claves = new Set(publicados.map((p) => p.clave));
  return bloques.map((b) => (!b.bibliotecaClave && claves.has(b.tipo) ? { ...b, bibliotecaClave: b.tipo } : b));
}

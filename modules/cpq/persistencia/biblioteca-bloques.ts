import type { Contexto } from "@opai/capabilities";
import { reglaDeNegocio, uuid7 } from "@opai/capabilities";

export async function sembrarBibliotecaEjemplo(ctx: Contexto, creadoPorId: string) {
  const existe = await ctx.db.cpqBibliotecaBloque.count({ where: { tenantId: ctx.tenantId } });
  if (existe > 0) return;
  const bloques = [
    { clave: "quienes-somos", tipo: "seccion_institucional", titulo: "Quiénes somos (TEST QA)" },
    { clave: "comprension-demo", tipo: "comprension_servicio", titulo: "Comprensión del servicio (TEST QA)" },
  ] as const;
  for (const b of bloques) {
    const contenido = JSON.stringify({ cuerpo: `Texto de ejemplo ${b.titulo} — Vigía Austral TEST QA.` });
    const bloqueId = uuid7();
    await ctx.db.cpqBibliotecaBloque.create({
      data: {
        id: bloqueId,
        tenantId: ctx.tenantId,
        clave: b.clave,
        tipo: b.tipo,
        titulo: b.titulo,
        estado: "publicado",
        versionPublicada: 1,
        contenidoJson: contenido,
        creadoPorId,
        publicadoPorId: creadoPorId,
        publicadoEn: new Date(),
      },
    });
    await ctx.db.cpqBibliotecaBloqueRevision.create({
      data: {
        id: uuid7(),
        tenantId: ctx.tenantId,
        bloqueId,
        version: 1,
        contenidoJson: contenido,
        creadoPorId,
      },
    });
  }
}

export async function publicarBloqueBiblioteca(ctx: Contexto, bloqueId: string, escribir: boolean) {
  const row = await ctx.db.cpqBibliotecaBloque.findFirst({ where: { id: bloqueId } });
  if (!row) throw reglaDeNegocio("Bloque no encontrado.");
  const nextVersion = row.versionPublicada + 1;
  if (!escribir) return { ...row, versionPublicada: nextVersion, estado: "publicado" as const };
  const actorId = ctx.actor.id ?? row.creadoPorId;
  return ctx.transaccion(async (tx) => {
    await tx.cpqBibliotecaBloqueRevision.create({
      data: {
        id: uuid7(),
        tenantId: ctx.tenantId,
        bloqueId: row.id,
        version: nextVersion,
        contenidoJson: row.contenidoJson,
        creadoPorId: actorId,
      },
    });
    return tx.cpqBibliotecaBloque.update({
      where: { id: row.id },
      data: {
        estado: "publicado",
        versionPublicada: nextVersion,
        publicadoPorId: actorId,
        publicadoEn: new Date(),
      },
    });
  });
}

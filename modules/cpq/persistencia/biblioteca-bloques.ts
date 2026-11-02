import type { Contexto } from "@opai/capabilities";
import { reglaDeNegocio, uuid7 } from "@opai/capabilities";

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

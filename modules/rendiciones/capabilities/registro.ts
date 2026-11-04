import type { Contexto } from "@opai/capabilities";

type Tx = Contexto["db"];

/** Anota un paso en la línea de tiempo y emite el evento del outbox, en la transacción de la escritura. */
export async function anotarPaso(
  ctx: Contexto,
  tx: Tx,
  r: { id: string; tenantId: string },
  paso: { tipo: string; actorId: string; desde?: string | null; hasta?: string | null; comentario?: string | null | undefined },
  payload: Record<string, unknown> = {},
): Promise<void> {
  await tx.rendicionHistorial.create({
    data: {
      tenantId: r.tenantId, rendicionId: r.id, tipo: paso.tipo, actorId: paso.actorId,
      estadoDesde: paso.desde ?? null, estadoHasta: paso.hasta ?? null, comentario: paso.comentario ?? null,
    },
  });
  await ctx.eventos.emitir(tx, { tipo: `rendiciones.rendicion.${paso.tipo}`, entidadTipo: "rendicion", entidadId: r.id, payload });
}

export function datosItems(tenantId: string, rendicionId: string, items: readonly {
  fecha: string; proveedor: string; folio?: string | undefined; descripcion: string; monto: number;
  documentoId?: string | undefined; sinRespaldoMotivo?: string | undefined;
}[]) {
  return items.map((i, orden) => ({
    tenantId, rendicionId, fecha: new Date(`${i.fecha}T00:00:00.000Z`), proveedor: i.proveedor, folio: i.folio ?? null,
    descripcion: i.descripcion, monto: i.monto, documentoId: i.documentoId ?? null,
    sinRespaldoMotivo: i.documentoId ? null : (i.sinRespaldoMotivo ?? null), orden,
  }));
}

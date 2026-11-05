import { conflicto, reglaDeNegocio, type Contexto } from "@opai/capabilities";

import { versionDeCotizacion } from "./version";

/** «Reabrir para editar» (R41): una versión lista vuelve a borrador; la aprobación anterior no se reutiliza. */
export async function reabrirParaEditar(ctx: Contexto, versionId: string) {
  const v = await versionDeCotizacion(ctx, versionId);
  if (v.estado !== "lista")
    throw reglaDeNegocio("Solo se reabre una cotización que está lista; las demás se editan o se versionan.");
  await ctx.transaccion(async (tx) => {
    const r = await tx.cpqVersion.updateMany({
      where: { id: versionId, estado: "lista" },
      data: { estado: "borrador" },
    });
    if (r.count === 0) throw conflicto("La versión cambió de estado mientras tanto; vuelve a cargar la ficha.");
    await ctx.eventos.emitir(tx, {
      tipo: "cpq.cotizacion.reabierta",
      entidadTipo: "cotizacion_version",
      entidadId: versionId,
      payload: { desde: "lista" },
    });
  });
  ctx.despacharEventos();
  return { estado: "borrador" as const };
}

import { z } from "zod";

import { conflicto, defineCapability, noEncontrado, prohibido, reglaDeNegocio } from "@opai/capabilities";

import { puedeAprobarLote, puedeTransitarLote, sinRendicionPropia, type EstadoLote } from "../domain";
import { uuidSchema } from "./esquemas";
import { loteSalidaSchema } from "./lotes-esquemas";
import { anotarPasoLote, aprobadoresDeLote } from "./lotes-util";
import { PERMISO_APROBAR_LOTE, PERMISO_PAGAR } from "./permisos";
import { actorId } from "./util";
import type { Contexto } from "@opai/capabilities";

/** Lote con los solicitantes de sus rendiciones (para la regla de «nadie actúa sobre lo suyo»). */
export async function loteConSolicitantes(ctx: Contexto, id: string) {
  const l = await ctx.db.lotePago.findFirst({ where: { id }, include: { items: { select: { rendicionId: true, personaId: true, cuentaVersion: true, montoClp: true } } } });
  if (!l) throw noEncontrado("El lote de pago");
  const rends = await ctx.db.rendicion.findMany({ where: { id: { in: l.items.map((i) => i.rendicionId) } }, select: { id: true, solicitanteId: true } });
  return { lote: l, solicitantes: rends.map((r) => r.solicitanteId) };
}

export function pasoPermitido(desde: string, hacia: EstadoLote): void {
  if (!puedeTransitarLote(desde as EstadoLote, hacia)) throw reglaDeNegocio(`Un lote «${desde}» no puede pasar a «${hacia}».`);
}

export const lotesAprobar = defineCapability({
  id: "rendiciones.lotes.aprobar",
  descripcion:
    "Aprueba un lote de pago en borrador. Quien lo creó no puede ser el único que lo aprueba: lo aprueba otra persona con el permiso, salvo que en la empresa solo una persona lo tenga (queda registrado). Nadie aprueba un lote con una rendición propia. Tras aprobarlo el total ya no cambia.",
  permiso: PERMISO_APROBAR_LOTE,
  portales: ["erp"],
  input: z.object({ id: uuidSchema }),
  output: loteSalidaSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const yo = actorId(ctx);
    const { lote, solicitantes } = await loteConSolicitantes(ctx, input.id);
    pasoPermitido(lote.estado, "aprobado");
    if (!sinRendicionPropia(yo, solicitantes)) throw prohibido("Nadie aprueba un lote de pago con una rendición propia.");
    const personas = await aprobadoresDeLote(ctx);
    if (!puedeAprobarLote(lote.creadoPorId, yo, personas)) throw prohibido("Quien creó el lote no lo aprueba: lo aprueba otra persona con ese permiso.");
    const soloUna = lote.creadoPorId === yo;
    const salida = { id: lote.id, estado: "aprobado" as const, totalClp: lote.totalClp, cantidad: lote.cantidad };
    if (dryRun) return salida;
    await ctx.transaccion(async (tx) => {
      const n = await tx.lotePago.updateMany({ where: { id: lote.id, estado: "borrador" }, data: { estado: "aprobado", aprobadoPorId: yo, aprobadoEn: new Date() } });
      if (n.count !== 1) throw conflicto("El lote cambió de estado mientras tanto.");
      await anotarPasoLote(ctx, tx, lote, { tipo: "aprobado", actorId: yo, desde: "borrador", hasta: "aprobado", comentario: soloUna ? "Aprobado por quien lo creó: es la única persona con el permiso de aprobar lotes." : null }, { totalClp: lote.totalClp });
    });
    return salida;
  },
});

export const lotesAnular = defineCapability({
  id: "rendiciones.lotes.anular",
  descripcion:
    "Anula un lote de pago que aún no se pagó (borrador, aprobado o generado), con el motivo. Sus rendiciones quedan libres para otro lote. Ojo: si la nómina de un lote «generado» ya se subió al banco, anularlo y rearmarlo puede pagar dos veces; confírmalo antes. Un lote pagado no se anula.",
  permiso: PERMISO_PAGAR,
  portales: ["erp"],
  input: z.object({ id: uuidSchema, motivo: z.string().trim().min(3).max(300) }),
  output: loteSalidaSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const yo = actorId(ctx);
    const { lote } = await loteConSolicitantes(ctx, input.id);
    pasoPermitido(lote.estado, "anulado");
    const salida = { id: lote.id, estado: "anulado" as const, totalClp: lote.totalClp, cantidad: lote.cantidad };
    if (dryRun) return salida;
    await ctx.transaccion(async (tx) => {
      const n = await tx.lotePago.updateMany({ where: { id: lote.id, estado: lote.estado }, data: { estado: "anulado", anuladoPorId: yo, anuladoEn: new Date(), motivoAnulacion: input.motivo } });
      if (n.count !== 1) throw conflicto("El lote cambió de estado mientras tanto.");
      await tx.lotePagoItem.updateMany({ where: { loteId: lote.id }, data: { activo: false } });
      await anotarPasoLote(ctx, tx, lote, { tipo: "anulado", actorId: yo, desde: lote.estado, hasta: "anulado", comentario: input.motivo });
    });
    return salida;
  },
});

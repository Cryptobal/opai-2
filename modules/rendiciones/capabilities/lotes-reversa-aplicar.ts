import { z } from "zod";

import { conflicto, defineCapability, prohibido, reglaDeNegocio } from "@opai/capabilities";

import { codigoLote, sinRendicionPropia } from "../domain";
import { uuidSchema } from "./esquemas";
import { loteSalidaSchema } from "./lotes-esquemas";
import { loteConSolicitantes, pasoPermitido } from "./lotes-flujo";
import { anotarPasoLote } from "./lotes-util";
import { PERMISO_PAGAR } from "./permisos";
import { anotarPaso } from "./registro";
import { actorId } from "./util";

export const lotesAplicarReversa = defineCapability({
  id: "rendiciones.lotes.aplicar_reversa",
  descripcion:
    "Aplica un lote de reversa aprobado: las rendiciones pasan de Pagada a Aprobada y quedan libres para pagarse de nuevo. Es irreversible; un agente necesita la aprobación de una persona.",
  permiso: PERMISO_PAGAR,
  portales: ["erp"],
  exigeAprobacion: () => true,
  input: z.object({
    id: uuidSchema,
    motivo: z.string().trim().min(3).max(300).describe("Motivo del administrador al revertir el pago."),
  }),
  output: loteSalidaSchema,
  efecto: "irreversible",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const yo = actorId(ctx);
    const { lote, solicitantes } = await loteConSolicitantes(ctx, input.id);
    if (!lote.esReversa) throw reglaDeNegocio("Solo aplica a un lote de reversa.");
    pasoPermitido(lote.estado, "aplicado", true);
    if (!sinRendicionPropia(yo, solicitantes)) throw prohibido("Nadie aplica un lote de reversa con una rendición propia.");
    const salida = { id: lote.id, estado: "aplicado" as const, totalClp: lote.totalClp, cantidad: lote.cantidad };
    if (dryRun) return salida;
    const ids = lote.items.map((i) => i.rendicionId);
    await ctx.transaccion(async (tx) => {
      const n = await tx.lotePago.updateMany({
        where: { id: lote.id, estado: "aprobado", esReversa: true },
        data: { estado: "aplicado", aplicadoPorId: yo, aplicadoEn: new Date(), motivoReversa: input.motivo },
      });
      if (n.count !== 1) throw conflicto("El lote cambió de estado mientras tanto.");
      const libera = await tx.lotePagoItem.updateMany({ where: { rendicionId: { in: ids }, activo: true }, data: { activo: false } });
      if (libera.count !== ids.length) throw conflicto("Una rendición ya no está ligada al lote pagado.");
      const p = await tx.rendicion.updateMany({ where: { id: { in: ids }, estado: "pagada" }, data: { estado: "aprobada" } });
      if (p.count !== ids.length) throw conflicto("Una rendición del lote ya no está pagada.");
      const rends = await tx.rendicion.findMany({
        where: { id: { in: ids } },
        select: { id: true, tenantId: true, codigo: true, solicitanteId: true, montoTotal: true },
      });
      for (const x of rends) {
        await anotarPaso(
          ctx,
          tx,
          x,
          { tipo: "reversa_pago", actorId: yo, desde: "pagada", hasta: "aprobada", comentario: `${codigoLote(lote.codigo)} · ${input.motivo}` },
          { loteId: lote.id, montoTotal: x.montoTotal, solicitanteId: x.solicitanteId },
        );
      }
      await anotarPasoLote(ctx, tx, lote, { tipo: "aplicado", actorId: yo, desde: "aprobado", hasta: "aplicado", comentario: input.motivo });
    });
    return salida;
  },
});
import { defineConsumidor } from "../eventos/consumidores";
import { planGanar } from "./ganar-efectos";

/**
 * R45 (cpq.md): al ganar el negocio, la versión enviada de la cotización vigente pasa a `aceptada` y
 * las demás versiones abiertas del negocio, a `rechazada`. Escucha `comercial.negocio.ganado` (los
 * módulos se hablan por eventos, ADR-029). Vive junto al de Comercial porque comparte el plan de la
 * vista previa (`planGanar`); sin cotizaciones en el negocio no hace nada. Idempotente: cada cambio va condicionado al estado de
 * origen y el plan se recalcula sobre lo actual. La oferta de puestos (R2) se anuncia con
 * `cpq.cotizacion.aceptada` y su conteo; crearlos queda en el PR de puestos (RRHH confirma).
 */
export const consumidorCpqGanado = defineConsumidor({
  id: "cpq.ganar.aceptar",
  descripcion: "Acepta la cotización vigente y rechaza las abiertas al ganar el negocio (R45).",
  eventos: ["comercial.negocio.ganado"],
  async handler(ctx, ev) {
    if (!ev.entidadId) return;
    const negocioId = ev.entidadId;
    await ctx.transaccion(async (tx) => {
      const negocio = await tx.negocio.findUnique({
        where: { id: negocioId },
        select: { id: true, cuentaId: true, estado: true },
      });
      if (!negocio || negocio.estado !== "ganado") return;
      const { efectos, rechazarIds } = await planGanar(tx, negocio);
      if (rechazarIds.length) {
        await tx.cpqVersion.updateMany({
          where: {
            id: { in: rechazarIds },
            estado: { in: ["borrador", "en_aprobacion", "lista", "enviada"] },
          },
          data: { estado: "rechazada" },
        });
      }
      const c = efectos.cotizacion;
      if (!c) return;
      const { count } = await tx.cpqVersion.updateMany({
        where: { id: c.versionId, estado: "enviada" },
        data: { estado: "aceptada" },
      });
      if (count !== 1) return;
      await ctx.eventos.emitir(tx, {
        tipo: "cpq.cotizacion.aceptada",
        entidadTipo: "cotizacion",
        entidadId: c.id,
        payload: {
          versionId: c.versionId,
          negocioId,
          puestosPorOfrecer: efectos.puestosPorOfrecer,
        },
      });
    });
  },
});

import { defineConsumidor } from "../eventos/consumidores";
import { aFecha, hoy } from "../core/maestros/comun";
import { CUENTA_SE_ACTIVA, INSTALACION_SE_ACTIVA, planGanar } from "./ganar-efectos";

/**
 * R18 (comercial.md): al ganar, la cuenta pasa a `cliente_activo` y las instalaciones vinculadas en
 * prospecto o inactivas se activan. Idempotente: el plan se recalcula sobre el estado actual y cada
 * escritura va condicionada al estado de origen, así que un reintento o una carrera no duplican nada.
 * Todo en una transacción, con un evento por cambio. Si el negocio ya no está ganado (se reabrió
 * antes de despachar), no hace nada. La aceptación de la cotización es de CPQ (`cpq.ganar`).
 */
export const consumidorNegocioGanado = defineConsumidor({
  id: "comercial.ganar.activar",
  descripcion: "Activa la cuenta y las instalaciones del negocio ganado (R18).",
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
      const { efectos } = await planGanar(tx, negocio);
      const causa = { negocioId, eventoId: ev.id };
      if (efectos.cuenta) {
        const actual = await tx.cuenta.findUnique({
          where: { id: efectos.cuenta.id },
          select: { clienteDesde: true },
        });
        const { count } = await tx.cuenta.updateMany({
          where: { id: efectos.cuenta.id, estado: { in: [...CUENTA_SE_ACTIVA] } },
          data: {
            estado: "cliente_activo",
            clienteDesde: actual?.clienteDesde ?? aFecha(hoy()),
            clienteHasta: null,
          },
        });
        if (count === 1) {
          await ctx.eventos.emitir(tx, {
            tipo: "core.cuenta.estado_cambiado",
            entidadTipo: "cuenta",
            entidadId: efectos.cuenta.id,
            payload: { desde: efectos.cuenta.desde, hacia: "cliente_activo", ...causa },
          });
        }
      }
      for (const i of efectos.instalaciones) {
        const { count } = await tx.instalacion.updateMany({
          where: { id: i.id, estado: { in: [...INSTALACION_SE_ACTIVA] }, archivadaEn: null },
          data: { estado: "activa" },
        });
        if (count === 1) {
          await ctx.eventos.emitir(tx, {
            tipo: "core.instalacion.estado_cambiado",
            entidadTipo: "instalacion",
            entidadId: i.id,
            payload: { desde: i.desde, hacia: "activa", ...causa },
          });
        }
      }
    });
  },
});

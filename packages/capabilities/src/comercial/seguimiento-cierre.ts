// Cierre aplicado automáticamente (CAR-67, R15): al terminar los pasos sin respuesta, si el plan lo
// pide, OPAI pierde el negocio con el motivo «Sin respuesta» y lo deja registrado y avisado.
import type { ConfigPlan } from "@opai/domain";

import type { Contexto } from "../types";
import { actividadDePaso } from "./seguimiento-ejecucion";
import { aplicarEtapa } from "./transiciones-util";

type Seg = { id: string; negocioId: string; planVersion: number };

/**
 * Devuelve `true` si perdió el negocio. Nunca cierra: un negocio que ya no está abierto, uno en la
 * etapa «no cerrar desde» o más adelante, uno con una respuesta del cliente, ni si falta la etapa
 * perdida o el motivo «sin_respuesta» en el catálogo.
 */
export async function cerrarSinRespuesta(ctx: Contexto, s: Seg, config: ConfigPlan): Promise<boolean> {
  if (config.alTerminar !== "aplicar_cierre_propuesto") return false;
  const negocio = await ctx.db.negocio.findUnique({ where: { id: s.negocioId } });
  if (!negocio || negocio.estado !== "abierto") return false;
  if (await ctx.db.seguimientoEntrante.count({ where: { seguimientoId: s.id } })) return false;
  const [actual, tope, perdida, motivo] = await Promise.all([
    ctx.db.etapa.findUnique({ where: { id: negocio.etapaId } }),
    config.noCerrarDesdeEtapa ? ctx.db.etapa.findUnique({ where: { id: config.noCerrarDesdeEtapa } }) : null,
    ctx.db.etapa.findFirst({ where: { embudoId: negocio.embudoId, tipo: "perdida" } }),
    ctx.db.motivoPerdida.findFirst({ where: { codigo: "sin_respuesta", activo: true } }),
  ]);
  if (!perdida || !motivo || !actual) return false;
  if (tope && actual.orden >= tope.orden) return false;
  const detalle = `Cerrado por la cadencia sin respuesta (plan v${s.planVersion}).`;
  await ctx.transaccion(async (tx) => {
    await aplicarEtapa(ctx, tx, negocio, perdida, {
      evento: "comercial.negocio.perdido",
      motivo: motivo.codigo,
      datos: { perdidoEn: new Date(), motivoPerdidaId: motivo.id, motivoPerdidaDetalle: detalle },
    });
    await actividadDePaso(ctx, tx, { tipo: "nota", titulo: "OPAI automático cerró el negocio", detalle, negocioId: s.negocioId });
    await ctx.eventos.emitir(tx, {
      tipo: "comercial.seguimiento.cierre_aplicado",
      entidadTipo: "negocio",
      entidadId: s.negocioId,
      payload: { seguimientoId: s.id, planVersion: s.planVersion },
    });
  });
  return true;
}

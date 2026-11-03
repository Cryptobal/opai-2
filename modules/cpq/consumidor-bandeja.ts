import { renderizar } from "@opai/domain";

import {
  defineConsumidor,
  type Contexto,
  type EventoPublicado,
} from "@opai/capabilities";
import { comunicableDe } from "../../packages/capabilities/src/core/comunicaciones/resolver";
import { variablesDe } from "../../packages/capabilities/src/core/comunicaciones/variables";

async function idsAprobadoresMargen(ctx: Contexto) {
  const m = await ctx.db.membership.findMany({
    where: { tenantId: ctx.tenantId, estado: "activa", rol: { in: ["owner", "admin"] } },
    select: { userId: true },
  });
  return [...new Set(m.map((x) => x.userId))];
}

async function idsAprobadoresEnvio(ctx: Contexto) {
  return idsAprobadoresMargen(ctx);
}

async function crearInAppSiFalta(
  tx: Contexto["db"],
  ctx: Contexto,
  ev: EventoPublicado,
  usuarioId: string,
  titulo: string,
  cuerpo: string,
  enlace: string | null,
) {
  if (!usuarioId) return;
  if (await tx.notificacion.findFirst({ where: { eventoId: ev.id, usuarioId } })) return;
  await tx.notificacion.create({
    data: {
      tenantId: ctx.tenantId,
      usuarioId,
      eventoId: ev.id,
      titulo,
      cuerpo,
      enlace,
    },
  });
}

async function entregarPlantilla(
  ctx: Contexto,
  tx: Contexto["db"],
  ev: EventoPublicado,
  usuarioIds: string[],
) {
  const e = comunicableDe(ev.tipo);
  if (!e?.plantillas.inapp) return;
  const datos = await variablesDe(ctx, ev);
  const rutas = e.variables.map((v) => v.ruta);
  const titulo = renderizar(e.plantillas.inapp.asunto, datos, rutas);
  const cuerpo = renderizar(e.plantillas.inapp.cuerpo, datos, rutas);
  const enlace = typeof datos["url"] === "string" ? datos["url"] : null;
  for (const uid of usuarioIds) {
    await crearInAppSiFalta(tx, ctx, ev, uid, titulo, cuerpo, enlace);
  }
}

/**
 * Avisos in-app de CPQ para la campana y la bandeja (CAR-141). No duplica N6 ni decide aprobaciones:
 * solo entrega notificaciones cuando se emiten los eventos del manifest.
 */
export const consumidorCpqBandeja = defineConsumidor({
  id: "cpq.bandeja",
  descripcion: "Notificaciones in-app de aprobaciones CPQ (margen y envío conjunto).",
  eventos: [
    "cpq.cotizacion.aprobacion_solicitada",
    "cpq.envio_propuesta.solicitado",
    "cpq.cotizacion.aprobada",
    "cpq.cotizacion.aprobacion_rechazada",
    "cpq.envio_propuesta.aprobado",
    "cpq.envio_propuesta.rechazado",
  ],
  async handler(ctx, ev) {
    const p = (ev.payload ?? {}) as Record<string, unknown>;
    await ctx.transaccion(async (tx) => {
      if (ev.tipo === "cpq.cotizacion.aprobacion_solicitada") {
        const solicitanteId = typeof p["solicitadaPorId"] === "string" ? p["solicitadaPorId"] : null;
        const destinos = (await idsAprobadoresMargen(ctx)).filter((id) => id !== solicitanteId);
        await entregarPlantilla(ctx, tx, ev, destinos);
        return;
      }
      if (ev.tipo === "cpq.envio_propuesta.solicitado") {
        const solicitanteId = typeof p["solicitadoPorId"] === "string" ? p["solicitadoPorId"] : null;
        const destinos = (await idsAprobadoresEnvio(ctx)).filter((id) => id !== solicitanteId);
        await entregarPlantilla(ctx, tx, ev, destinos);
        return;
      }
      if (ev.tipo === "cpq.cotizacion.aprobada" || ev.tipo === "cpq.cotizacion.aprobacion_rechazada") {
        const aprobacionId = typeof p["aprobacionId"] === "string" ? p["aprobacionId"] : null;
        const pend = aprobacionId
          ? await tx.cpqAprobacion.findFirst({ where: { id: aprobacionId } })
          : null;
        const uid = pend?.solicitadaPorId;
        if (uid) await entregarPlantilla(ctx, tx, ev, [uid]);
        return;
      }
      if (ev.tipo === "cpq.envio_propuesta.aprobado" || ev.tipo === "cpq.envio_propuesta.rechazado") {
        const uid = typeof p["solicitadoPorId"] === "string" ? p["solicitadoPorId"] : null;
        if (uid) await entregarPlantilla(ctx, tx, ev, [uid]);
      }
    });
  },
});

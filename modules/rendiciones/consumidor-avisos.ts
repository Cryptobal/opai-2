import { renderizar } from "@opai/domain";

import {
  avisarPushTrasCampana,
  defineConsumidor,
  enviarCorreo,
  type Contexto,
  type EventoPublicado,
} from "@opai/capabilities";
import { comunicableDe, plantillaVigente } from "../../packages/capabilities/src/core/comunicaciones/resolver";
import { variablesDe } from "../../packages/capabilities/src/core/comunicaciones/variables";

const EVENTOS = [
  "rendiciones.rendicion.enviada",
  "rendiciones.rendicion.aprobada",
  "rendiciones.rendicion.rechazada",
  "rendiciones.rendicion.devuelta",
  "rendiciones.rendicion.pagada",
] as const;

function destinatarioId(ev: EventoPublicado, r: { aprobadorId: string | null; solicitanteId: string }) {
  if (ev.tipo === "rendiciones.rendicion.enviada") return r.aprobadorId;
  return r.solicitanteId;
}

async function entregarInApp(
  tx: Contexto["db"],
  ctx: Contexto,
  ev: EventoPublicado,
  usuarioId: string,
  datos: Record<string, unknown>,
  enlace: string,
) {
  const e = comunicableDe(ev.tipo);
  if (!e?.plantillas.inapp) return;
  if (await tx.notificacion.findFirst({ where: { eventoId: ev.id, usuarioId } })) return;
  const p = await plantillaVigente(tx, e, "inapp");
  if (!p) return;
  const rutas = e.variables.map((v) => v.ruta);
  await tx.notificacion.create({
    data: {
      tenantId: ctx.tenantId,
      usuarioId,
      eventoId: ev.id,
      titulo: renderizar(p.asunto, datos, rutas),
      cuerpo: renderizar(p.cuerpo, datos, rutas),
      enlace,
    },
  });
}

async function entregarCorreo(ctx: Contexto, ev: EventoPublicado, email: string, datos: Record<string, unknown>) {
  if (
    await ctx.db.envio.findFirst({
      where: { eventoId: ev.id, destinatario: email, canal: "correo", estado: { in: ["enviado", "omitido"] } },
    })
  ) {
    return;
  }
  await enviarCorreo(
    { db: ctx.db, tenantId: ctx.tenantId, correo: ctx.servicios.correo, urlBase: ctx.servicios.urlBase, eventoId: ev.id },
    ev.tipo,
    email,
    datos,
  );
}

/**
 * Campana y correo de rendiciones (CAR-598): enviada → aprobador; decisión y pago → quien rinde.
 * Idempotente por evento y usuario. Sin montos en las plantillas.
 */
export const consumidorRendicionesAvisos = defineConsumidor({
  id: "rendiciones.avisos",
  descripcion: "Entrega avisos in-app y por correo en las transiciones de una rendición.",
  eventos: [...EVENTOS],
  async handler(ctx, ev) {
    if (ev.entidadTipo !== "rendicion" || !ev.entidadId) return;
    const r = await ctx.db.rendicion.findFirst({
      where: { id: ev.entidadId },
      select: { id: true, solicitanteId: true, aprobadorId: true },
    });
    if (!r) return;
    const usuarioId = destinatarioId(ev, r);
    if (!usuarioId || usuarioId === ev.actorId || usuarioId === ev.viaUserId) return;
    const activo = await ctx.db.membership.findFirst({
      where: { tenantId: ctx.tenantId, userId: usuarioId, estado: "activa" },
      select: { userId: true },
    });
    if (!activo) return;
    const user = await ctx.db.user.findUnique({ where: { id: usuarioId }, select: { email: true } });
    if (!user?.email) return;
    const datos = await variablesDe(ctx, ev);
    const enlace = typeof datos["url"] === "string" ? datos["url"] : `/rendiciones/${r.id}`;
    await ctx.transaccion(async (tx) => {
      await entregarInApp(tx, ctx, ev, usuarioId, datos, enlace);
    });
    await avisarPushTrasCampana(ctx, usuarioId, ev.tipo, enlace);
    await entregarCorreo(ctx, ev, user.email, datos);
  },
});
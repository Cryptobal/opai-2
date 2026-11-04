// Aviso al vendedor cuando su cliente responde o OPAI cierra el negocio (CAR-67, ADR-020).
// Silencio por defecto: solo actúa con el ajuste `seguimiento_aviso_responsable` encendido. Las reglas
// de Comunicaciones (roles o personas concretas) siguen funcionando aparte, con las mismas plantillas.
import { renderizar } from "@opai/domain";

import { ajuste } from "../core/config/valores";
import { comunicableDe, plantillaVigente } from "../core/comunicaciones/resolver";
import { variablesDe } from "../core/comunicaciones/variables";
import { defineConsumidor } from "../eventos/consumidores";

/** Campana al responsable del negocio, leído de la base (nunca del payload), si sigue activo. */
export const consumidorSeguimientoAviso = defineConsumidor({
  id: "comercial.seguimiento_aviso_responsable",
  descripcion: "Notifica al vendedor del negocio cuando el cliente responde o el plan cierra sin respuesta, si la empresa lo activó.",
  eventos: ["comercial.seguimiento.cliente_respondio", "comercial.seguimiento.cierre_aplicado"],
  async handler(ctx, ev) {
    if (!ev.entidadId) return;
    if (!(await ajuste<boolean>(ctx, "comercial", "seguimiento_aviso_responsable"))) return;
    const e = comunicableDe(ev.tipo);
    const plantilla = e ? await plantillaVigente(ctx.db, e, "inapp") : null;
    if (!e || !plantilla) return;
    const negocio = await ctx.db.negocio.findUnique({ where: { id: ev.entidadId }, select: { responsableId: true } });
    if (!negocio?.responsableId) return;
    const activo = await ctx.db.membership.findFirst({ where: { tenantId: ctx.tenantId, userId: negocio.responsableId, estado: "activa" }, select: { userId: true } });
    if (!activo) return;
    if (await ctx.db.notificacion.findFirst({ where: { eventoId: ev.id, usuarioId: activo.userId } })) return;
    const datos = await variablesDe(ctx, ev);
    const rutas = e.variables.map((v) => v.ruta);
    await ctx.db.notificacion.create({
      data: {
        tenantId: ctx.tenantId,
        usuarioId: activo.userId,
        eventoId: ev.id,
        titulo: renderizar(plantilla.asunto, datos, rutas),
        cuerpo: renderizar(plantilla.cuerpo, datos, rutas),
        enlace: typeof datos["url"] === "string" ? datos["url"] : null,
      },
    });
  },
});

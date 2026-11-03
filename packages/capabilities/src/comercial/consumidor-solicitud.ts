import { renderizar } from "@opai/domain";

import { defineConsumidor } from "../eventos/consumidores";
import { comunicableDe, plantillaVigente } from "../core/comunicaciones/resolver";
import { variablesDe } from "../core/comunicaciones/variables";

/**
 * Aviso in-app al responsable del canal cuando entra una solicitud (Brief 07 PR 2). Complementa las
 * reglas de Comunicaciones: si hay `responsableId` en el payload, siempre crea la campana aunque no
 * haya regla activa para el evento.
 */
export const consumidorSolicitudCreada = defineConsumidor({
  id: "comercial.solicitud.responsable",
  descripcion: "Campana al responsable del canal cuando se crea una solicitud.",
  eventos: ["comercial.solicitud.creada"],
  async handler(ctx, ev) {
    const p = ev.payload as Record<string, unknown> | null;
    const responsableId = p?.["responsableId"];
    if (typeof responsableId !== "string" || !responsableId) return;
    if (await ctx.db.notificacion.findFirst({ where: { eventoId: ev.id, usuarioId: responsableId } }))
      return;
    const e = comunicableDe(ev.tipo);
    if (!e) return;
    const plantilla = await plantillaVigente(ctx.db, e, "inapp");
    if (!plantilla) return;
    const datos = await variablesDe(ctx, ev);
    const rutas = e.variables.map((v) => v.ruta);
    await ctx.db.notificacion.create({
      data: {
        tenantId: ctx.tenantId,
        usuarioId: responsableId,
        eventoId: ev.id,
        titulo: renderizar(plantilla.asunto, datos, rutas),
        cuerpo: renderizar(plantilla.cuerpo, datos, rutas),
        enlace: typeof datos["url"] === "string" ? datos["url"] : null,
      },
    });
  },
});

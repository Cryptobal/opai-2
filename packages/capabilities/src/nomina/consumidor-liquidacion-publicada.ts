import { z } from "zod";

import { renderizar } from "@opai/domain";

import { comunicableDe, plantillaVigente } from "../core/comunicaciones/resolver";
import { enviarCorreo } from "../core/comunicaciones/envio";
import { defineConsumidor, type EventoPublicado } from "../eventos/consumidores";

import { EVENTO_LIQUIDACION_PUBLICADA } from "./liquidaciones-publicar";

const payload = z.object({
  liquidacionId: z.string().uuid(),
  periodoId: z.string().uuid(),
  documentoId: z.string().uuid(),
  periodo: z.string(),
});

/** Correo transaccional e in-app al publicar la liquidación (CAR-99). */
export const consumidorLiquidacionPublicada = defineConsumidor({
  id: "nomina.liquidacion.publicada",
  descripcion: "Envía la liquidación al correo personal del trabajador y le deja un aviso en el portal.",
  eventos: [EVENTO_LIQUIDACION_PUBLICADA],
  async handler(ctx, ev: EventoPublicado) {
    const p = payload.safeParse(ev.payload);
    if (!p.success || !ev.entidadId) return;
    const persona = await ctx.db.persona.findUnique({
      where: { id: ev.entidadId },
      select: { nombres: true, apellidos: true, emailPersonal: true, usuarioId: true },
    });
    if (!persona) return;
    const e = comunicableDe(ev.tipo);
    if (!e) return;
    const empresa = await ctx.db.tenant.findUnique({ where: { id: ctx.tenantId }, select: { nombre: true } });
    const url = `${ctx.servicios.urlBase}/trabajador/mis-documentos`;
    const datos = {
      trabajador: { nombre: `${persona.nombres} ${persona.apellidos}`.trim() },
      periodo: { nombre: p.data.periodo },
      empresa: { nombre: empresa?.nombre ?? "" },
      url,
    };
    const rutas = e.variables.map((v) => v.ruta);
    const correo = persona.emailPersonal?.trim();
    if (correo) {
      const ya = await ctx.db.envio.count({
        where: { eventoId: ev.id, plantillaEvento: e.evento, estado: "enviado" },
      });
      if (ya === 0) {
        await enviarCorreo(
          { db: ctx.db, tenantId: ctx.tenantId, correo: ctx.servicios.correo, urlBase: ctx.servicios.urlBase, eventoId: ev.id },
          e.evento,
          correo,
          datos,
        );
      }
    }
    if (!persona.usuarioId) return;
    const inapp = await plantillaVigente(ctx.db, e, "inapp");
    if (!inapp) return;
    if (await ctx.db.notificacion.findFirst({ where: { eventoId: ev.id, usuarioId: persona.usuarioId } })) return;
    await ctx.db.notificacion.create({
      data: {
        tenantId: ctx.tenantId,
        usuarioId: persona.usuarioId,
        eventoId: ev.id,
        titulo: renderizar(inapp.asunto, datos, rutas),
        cuerpo: renderizar(inapp.cuerpo, datos, rutas),
        enlace: url,
      },
    });
  },
});
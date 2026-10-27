import { renderizar } from "@opai/domain";

import { defineConsumidor, type EventoPublicado } from "../../eventos/consumidores";
import { correoDe } from "../../integraciones/adaptadores";
import type { Contexto } from "../../types";
import { supervisoresConDocEnAlcance } from "../documentos/alcance-doc";
import { type Destinatario, destinatarios, silenciados } from "./destinatarios";
import { enviarCorreo } from "./envio";
import { comunicableDe, comunicables, plantillaVigente } from "./resolver";
import { variablesDe } from "./variables";

async function entregar(
  ctx: Contexto,
  ev: EventoPublicado,
  canal: string,
  para: Destinatario,
  datos: Record<string, unknown>,
  silencio: boolean,
) {
  const e = comunicableDe(ev.tipo);
  if (!e) return;
  if (canal === "inapp") {
    if (await ctx.db.notificacion.findFirst({ where: { eventoId: ev.id, usuarioId: para.id } }))
      return;
    const p = await plantillaVigente(ctx.db, e, "inapp");
    if (!p) return;
    const rutas = e.variables.map((v) => v.ruta);
    await ctx.db.notificacion.create({
      data: {
        tenantId: ctx.tenantId,
        usuarioId: para.id,
        eventoId: ev.id,
        titulo: renderizar(p.asunto, datos, rutas),
        cuerpo: renderizar(p.cuerpo, datos, rutas),
        enlace: typeof datos["url"] === "string" ? datos["url"] : null,
      },
    });
    return;
  }
  if (canal !== "correo") return;
  const previo = await ctx.db.envio.findFirst({
    where: {
      eventoId: ev.id,
      destinatario: para.email,
      canal,
      estado: { in: ["enviado", "omitido"] },
    },
  });
  if (previo) return;
  if (silencio) {
    await ctx.db.envio.create({
      data: {
        tenantId: ctx.tenantId,
        eventoId: ev.id,
        canal,
        destinatario: para.email,
        plantillaEvento: ev.tipo,
        estado: "omitido",
        error: "El usuario silenció los avisos por correo.",
      },
    });
    return;
  }
  await enviarCorreo(
    {
      db: ctx.db,
      tenantId: ctx.tenantId,
      correo: await correoDe(ctx),
      urlBase: ctx.servicios.urlBase,
      eventoId: ev.id,
    },
    ev.tipo,
    para.email,
    datos,
  );
}

/**
 * Comunicaciones (ADR-020): evento → reglas activas → destinatarios → plantilla vigente → canal.
 * Sin regla, nada se envía (queda un envío "omitido"). Idempotente ante reintentos del despacho.
 */
export const consumidorComunicaciones = defineConsumidor({
  id: "core.comunicaciones",
  descripcion: "Envía los avisos de eventos comunicables según las reglas de la empresa.",
  eventos: comunicables()
    .filter((e) => !e.transaccional)
    .map((e) => e.evento),
  async handler(ctx, ev) {
    const reglas = await ctx.db.notificacionRegla.findMany({
      where: { evento: ev.tipo, activa: true },
    });
    if (!reglas.length) {
      await ctx.db.envio.create({
        data: {
          tenantId: ctx.tenantId,
          eventoId: ev.id,
          canal: "ninguno",
          destinatario: "-",
          plantillaEvento: ev.tipo,
          estado: "omitido",
          error: "Sin regla activa.",
        },
      });
      return;
    }
    const datos = await variablesDe(ctx, ev);
    // Avisos de documentos: solo a los supervisores que tienen el documento en su alcance (ADR-022).
    const supervisoresPermitidos =
      ev.entidadTipo === "documento" && ev.entidadId
        ? await supervisoresConDocEnAlcance(ctx, ev.entidadId)
        : null;
    for (const r of reglas) {
      const para = await destinatarios(
        ctx,
        r.destinatariosRoles,
        r.destinatariosUsuarios,
        supervisoresPermitidos,
      );
      const silencio = await silenciados(
        ctx,
        para.map((p) => p.id),
      );
      for (const u of para) await entregar(ctx, ev, r.canal, u, datos, silencio.has(u.id));
    }
  },
});

import { serieVigente } from "@opai/domain";
import { z } from "zod";

import { defineConsumidor } from "../eventos/consumidores";
import type { Contexto } from "../types";
import { cargarSeriesDe } from "./cargar";
import { nombreMes } from "./consumidor-publicada";
import { diasDelMes } from "./publicar-plan";

const fechaSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const payloadSchema = z.object({
  puestoId: z.string(),
  desde: fechaSchema,
  hasta: fechaSchema.optional(),
  titularId: z.string().nullable().optional(),
});

/** Día anterior (aaaa-mm-dd), en UTC: la serie que se reemplaza queda vigente hasta ese día. */
function diaAnterior(fecha: string): string {
  const d = new Date(`${fecha}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/** «5 de diciembre» desde aaaa-mm-dd. */
function diaTexto(fecha: string): string {
  return `${Number(fecha.slice(8))} de ${nombreMes(fecha.slice(0, 7)).split(" de ")[0]}`;
}

/**
 * Titulares afectados por un cambio en un puesto dentro de los meses publicados: el titular vigente en cada día
 * cambiado y, si cambió la serie, también el titular anterior (pierde esos días) y el nuevo.
 */
async function afectados(ctx: Contexto, p: z.output<typeof payloadSchema>, meses: string[]) {
  const series = (await cargarSeriesDe(ctx, [p.puestoId])).get(p.puestoId) ?? [];
  const ids = new Set<string>();
  for (const mes of meses) {
    for (const f of diasDelMes(mes)) {
      if (f < p.desde || (p.hasta && f > p.hasta)) continue;
      const v = serieVigente(series, f);
      if (v?.titularId) ids.add(v.titularId);
    }
  }
  if (p.titularId) ids.add(p.titularId);
  if (!p.hasta) {
    const anterior = series.find((s) => s.hasta === diaAnterior(p.desde));
    if (anterior?.titularId) ids.add(anterior.titularId);
  }
  return [...ids];
}

/**
 * Aviso en el portal cuando cambia la pauta de un mes ya publicado (CAR-356 PR 3): ausencias, reemplazos,
 * refuerzos, anulaciones o un cambio de serie en un puesto de una instalación con el mes publicado. Avisa a los
 * titulares afectados con usuario; idempotente por evento y usuario. Si el mes no está publicado, no avisa.
 */
export const consumidorPautaCambio = defineConsumidor({
  id: "pauta.cambio.avisar",
  descripcion:
    "Avisa en su portal a los guardias titulares cuando cambia la pauta de un mes ya publicado.",
  eventos: ["pauta.excepcion.creada", "pauta.excepcion.anulada", "pauta.serie.fijada"],
  async handler(ctx, ev) {
    const p = payloadSchema.safeParse(ev.payload);
    if (!p.success) return;
    const puesto = await ctx.db.puesto.findFirst({
      where: { id: p.data.puestoId },
      select: { instalacionId: true },
    });
    if (!puesto) return;
    const mesDesde = p.data.desde.slice(0, 7);
    const mesHasta = p.data.hasta?.slice(0, 7);
    const publicadas = await ctx.db.publicacionPauta.findMany({
      where: {
        instalacionId: puesto.instalacionId,
        mes: { gte: mesDesde, ...(mesHasta ? { lte: mesHasta } : {}) },
      },
      select: { mes: true },
      orderBy: { mes: "asc" },
    });
    if (publicadas.length === 0) return;
    const ids = await afectados(
      ctx,
      p.data,
      publicadas.map((x) => x.mes),
    );
    if (ids.length === 0) return;
    const inst = await ctx.db.instalacion.findFirst({
      where: { id: puesto.instalacionId },
      select: { nombre: true },
    });
    const personas = await ctx.db.persona.findMany({
      where: { id: { in: ids }, usuarioId: { not: null } },
      select: { usuarioId: true },
    });
    const primerMes = publicadas[0]?.mes ?? mesDesde;
    const desde = p.data.desde > `${primerMes}-01` ? p.data.desde : `${primerMes}-01`;
    for (const { usuarioId } of personas) {
      if (!usuarioId) continue;
      if (await ctx.db.notificacion.findFirst({ where: { eventoId: ev.id, usuarioId } })) continue;
      await ctx.db.notificacion.create({
        data: {
          tenantId: ctx.tenantId,
          usuarioId,
          eventoId: ev.id,
          titulo: `Cambió tu pauta de ${nombreMes(primerMes)}`,
          cuerpo: `${inst?.nombre ?? "Tu instalación"}: hubo un cambio en los turnos desde el ${diaTexto(desde)}. Revisa tu pauta en el portal.`,
          enlace: "/trabajador",
        },
      });
    }
  },
});

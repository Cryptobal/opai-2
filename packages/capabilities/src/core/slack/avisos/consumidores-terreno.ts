// Slack F3 (CAR-293): incidentes del libro de novedades y pánico de la app de terreno → Slack.
import { z } from "zod";

import { defineConsumidor } from "../../../eventos/consumidores";
import { configSiConectada, registrarAvisoSlack } from "./registrar";

const MIN = 60_000;

/** Novedades de gravedad alta recién sincronizadas desde terreno (`core.terreno.hechos_recibidos`). */
export const consumidorSlackIncidentes = defineConsumidor({
  id: "core.slack.avisos_incidentes",
  descripcion:
    "Avisa a Slack las novedades graves (incidentes) que llegan desde terreno, si la empresa las activó.",
  eventos: ["core.terreno.hechos_recibidos"],
  async handler(ctx, ev) {
    const p = z
      .object({ instalacionId: z.uuid(), porTipo: z.record(z.string(), z.number()) })
      .safeParse(ev.payload);
    if (!p.success || !p.data.porTipo["rondas.novedad"]) return;
    const c = await configSiConectada(ctx);
    if (!c?.avisos.incidentes) return;
    // Las novedades de este lote se guardaron en la misma transacción que el evento.
    const graves = await ctx.db.novedad.findMany({
      where: {
        instalacionId: p.data.instalacionId,
        gravedad: "alta",
        createdAt: { gte: new Date(ev.createdAt.getTime() - 2 * MIN) },
      },
      select: { id: true, resumen: true, detalle: true },
      orderBy: { createdAt: "asc" },
      take: 20,
    });
    const inst = await ctx.db.instalacion.findUnique({
      where: { id: p.data.instalacionId },
      select: { nombre: true },
    });
    for (const n of graves)
      await registrarAvisoSlack(ctx, {
        tipo: "incidente",
        clave: `incidente:${n.id}`,
        instalacionId: p.data.instalacionId,
        personaId: null,
        titulo: `Incidente${inst ? ` en ${inst.nombre}` : ""}: ${n.resumen}`,
        detalle: n.detalle,
        enlace: `/instalaciones/${p.data.instalacionId}`,
      });
  },
});

const panicoSchema = z.object({
  /** Id del pánico en OPAI (F5b); hace única la clave del aviso. */
  panicoId: z.uuid(),
  instalacionId: z.uuid(),
  personaId: z.uuid().nullable().optional(),
  /** Hora local legible de cuando se apretó, si viene. */
  hora: z.string().max(40).optional(),
});

/**
 * Pánico apretado en la app de terreno (`core.terreno.panico`; el botón entra con F5b, CAR-296). Avisa
 * al canal, por mensaje directo a los supervisores a cargo y escala si nadie lo toma, según la empresa.
 */
export const consumidorSlackPanico = defineConsumidor({
  id: "core.slack.avisos_panico",
  descripcion:
    "Avisa a Slack el pánico de un guardia: canal, supervisores a cargo y escalamiento, según la empresa.",
  eventos: ["core.terreno.panico"],
  async handler(ctx, ev) {
    const p = panicoSchema.safeParse(ev.payload);
    if (!p.success || !(await configSiConectada(ctx))) return;
    const [persona, inst] = await Promise.all([
      p.data.personaId
        ? ctx.db.persona.findUnique({
            where: { id: p.data.personaId },
            select: { nombres: true, apellidos: true },
          })
        : null,
      ctx.db.instalacion.findUnique({
        where: { id: p.data.instalacionId },
        select: { nombre: true },
      }),
    ]);
    const quien = persona ? `${persona.nombres} ${persona.apellidos}`.trim() : "Un guardia";
    await registrarAvisoSlack(ctx, {
      tipo: "panico",
      clave: `panico:${p.data.panicoId}`,
      instalacionId: p.data.instalacionId,
      personaId: p.data.personaId ?? null,
      titulo: `PÁNICO: ${quien}${inst ? ` en ${inst.nombre}` : ""}`,
      detalle: p.data.hora ? `Lo apretó a las ${p.data.hora}.` : null,
      enlace: `/instalaciones/${p.data.instalacionId}`,
    });
  },
});

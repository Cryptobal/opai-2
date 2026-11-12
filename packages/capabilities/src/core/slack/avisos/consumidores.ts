// Slack F3 (CAR-293): de los eventos de terreno que ya existen a avisos de Slack. Solo anomalías: una
// marca normal nunca genera aviso. Cada consumidor es idempotente (clave única por hecho de origen) y
// no hace nada sin Slack conectado o con el aviso apagado (ver `registrarAvisoSlack`).
import { z } from "zod";

import { defineConsumidor } from "../../../eventos/consumidores";
import type { Contexto } from "../../../types";
import { configSiConectada, registrarAvisoSlack } from "./registrar";

const MIN = 60_000;

async function nombrePersona(ctx: Contexto, id: string | null | undefined) {
  if (!id) return "Un guardia";
  const p = await ctx.db.persona.findUnique({
    where: { id },
    select: { nombres: true, apellidos: true },
  });
  return p ? `${p.nombres} ${p.apellidos}`.trim() : "Un guardia";
}

async function nombreInstalacion(ctx: Contexto, id: string | null | undefined) {
  if (!id) return null;
  return (
    (await ctx.db.instalacion.findUnique({ where: { id }, select: { nombre: true } }))?.nombre ??
    null
  );
}

const marcaSchema = z.object({
  marcaId: z.uuid(),
  personaId: z.uuid(),
  tipo: z.string(),
  instalacionId: z.uuid(),
  gpsEstado: z.string().optional(),
  turnoInicio: z.iso.datetime().nullable().optional(),
  horaServidor: z.iso.datetime().optional(),
  distanciaM: z.number().nullable().optional(),
  origen: z.string().optional(),
});

/** Atraso sobre el margen de la empresa y marca fuera de zona (`asistencia.marca.registrada`). */
export const consumidorSlackMarcas = defineConsumidor({
  id: "core.slack.avisos_marcas",
  descripcion:
    "Avisa a Slack el atraso sobre el margen y la marca fuera de zona, si la empresa los activó.",
  eventos: ["asistencia.marca.registrada"],
  async handler(ctx, ev) {
    const p = marcaSchema.safeParse(ev.payload);
    if (!p.success) return;
    const c = await configSiConectada(ctx);
    if (!c) return;
    const m = p.data;
    // Una marca que llega tarde por estar sin conexión no es un atraso real: no se avisa (revisión de F3).
    const atrasoMin =
      m.tipo === "entrada" && m.origen !== "offline_queue" && m.turnoInicio && m.horaServidor
        ? Math.floor((Date.parse(m.horaServidor) - Date.parse(m.turnoInicio)) / MIN)
        : null;
    const atraso = c.avisos.atraso && atrasoMin !== null && atrasoMin >= c.margenAtrasoMin;
    const fuera = c.avisos.fueraDeZona && m.gpsEstado === "fuera";
    if (!atraso && !fuera) return;
    const [persona, lugar] = await Promise.all([
      nombrePersona(ctx, m.personaId),
      nombreInstalacion(ctx, m.instalacionId),
    ]);
    const donde = lugar ? ` en ${lugar}` : "";
    const base = {
      instalacionId: m.instalacionId,
      personaId: m.personaId,
      enlace: `/personas/${m.personaId}`,
    };
    if (atraso)
      await registrarAvisoSlack(ctx, {
        ...base,
        tipo: "atraso",
        clave: `atraso:${m.marcaId}`,
        titulo: `Atraso: ${persona} marcó entrada ${atrasoMin} min tarde${donde}`,
      });
    if (fuera)
      await registrarAvisoSlack(ctx, {
        ...base,
        tipo: "fuera_de_zona",
        clave: `fuera_de_zona:${m.marcaId}`,
        titulo: `Fuera de zona: ${persona} marcó lejos de la instalación${donde}`,
        detalle: m.distanciaM
          ? `A unos ${Math.round(m.distanciaM)} m del punto de la instalación.`
          : null,
      });
  },
});

const ausenciaSchema = z.object({
  personaId: z.uuid(),
  clave: z.string(),
  instalacionId: z.uuid().optional(),
  turno: z.object({ inicio: z.string().optional(), lugar: z.string().optional() }).optional(),
});

/** Ausencia: pasó el plazo sin marca de entrada (`asistencia.alerta.sin_marca_inicio`). */
export const consumidorSlackAusencia = defineConsumidor({
  id: "core.slack.avisos_ausencia",
  descripcion: "Avisa a Slack la ausencia (turno sin marca de entrada), si la empresa la activó.",
  eventos: ["asistencia.alerta.sin_marca_inicio"],
  async handler(ctx, ev) {
    const p = ausenciaSchema.safeParse(ev.payload);
    if (!p.success || !(await configSiConectada(ctx))?.avisos.ausencia) return;
    const persona = await nombrePersona(ctx, p.data.personaId);
    const t = p.data.turno;
    await registrarAvisoSlack(ctx, {
      tipo: "ausencia",
      clave: `ausencia:${p.data.clave}`,
      instalacionId: p.data.instalacionId ?? null,
      personaId: p.data.personaId,
      titulo: `Ausencia: ${persona} no marcó la entrada de su turno`,
      detalle: t?.inicio ? `Turno de ${t.inicio}${t.lugar ? ` en ${t.lugar}` : ""}.` : null,
      enlace: `/personas/${p.data.personaId}`,
    });
  },
});

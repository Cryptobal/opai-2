import { z } from "zod";

import { atrasoDeRonda, instanteLocal, tramosVencidos } from "@opai/domain";

import { zonaDelTenant } from "../core/turnos/comun";
import { defineTrabajo } from "../trabajos/registro";
import type { Contexto } from "../types";
import { noRealizadas, rondasRecientes, type Senal } from "./vigilancia-consultas";

const MIN_MS = 60_000;
const TRAMO_MS = 5 * MIN_MS;
const TIPOS: Senal["tipo"][] = [
  "rondas.ejecucion.no_realizada",
  "rondas.ejecucion.atrasada",
  "rondas.punto.omitido",
];

async function rondasActivo(ctx: Contexto): Promise<boolean> {
  if (ctx.modulosActivos.includes("rondas")) return true;
  const m = await ctx.db.tenantModule.findFirst({
    where: { tenantId: ctx.tenantId, moduloId: "rondas", estado: { in: ["activo", "trial"] } },
    select: { id: true },
  });
  return m !== null;
}

/** Señales de atraso y de tramo vencido de las rondas recientes dentro de [desde, hasta). */
async function atrasosYTramos(ctx: Contexto, desde: Date, hasta: Date): Promise<Senal[]> {
  const senales: Senal[] = [];
  for (const e of await rondasRecientes(ctx, hasta)) {
    const vence = atrasoDeRonda(e.ronda, desde, hasta);
    if (vence)
      senales.push({
        tipo: "rondas.ejecucion.atrasada",
        entidadTipo: "ejecucion_ronda",
        entidadId: e.id,
        payload: { ...e.base, vencioEn: vence.toISOString() },
      });
    for (const t of tramosVencidos(e.ronda, desde, hasta))
      senales.push({
        tipo: "rondas.punto.omitido",
        entidadTipo: "ejecucion_ronda",
        entidadId: e.id,
        payload: { ...e.base, puntoId: t.puntoId, vencioEn: t.vence.toISOString() },
      });
  }
  return senales;
}

/**
 * Vigilancia cada 5 min de Rondas (CAR-501, CAR-748): emite las señales que la Central convierte en alertas. Revisa el
 * tramo anterior a `tramo` («aaaa-mm-ddTHH:mm» en la hora local del tenant, el que encola el cron de trabajos): rondas
 * programadas que no se iniciaron, rondas que superaron su tiempo máximo y tramos vencidos con puntos obligatorios
 * pendientes. La ventana es fija por tramo de 5 min, el trabajo es único por tramo y las señales llevan la `tramo`: un
 * reintento del mismo tramo no las repite, y todas van en una transacción.
 */
export const trabajoVigilanciaRondas = defineTrabajo({
  tipo: "rondas.vigilancia.revisar",
  descripcion:
    "Emite las señales de Rondas del tramo de 5 min anterior: rondas programadas no iniciadas, rondas atrasadas y puntos obligatorios con el tramo vencido.",
  periodicidad: "cada5min",
  payload: z.object({ tramo: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/) }),
  async handler(ctx, { tramo }) {
    if (!(await rondasActivo(ctx))) return { senales: 0 };
    const zona = await zonaDelTenant(ctx);
    const hasta = instanteLocal(tramo.slice(0, 10), tramo.slice(11), zona);
    const desde = new Date(hasta.getTime() - TRAMO_MS);
    const senales = [
      ...(await noRealizadas(ctx, desde, hasta, zona)),
      ...(await atrasosYTramos(ctx, desde, hasta)),
    ];
    if (senales.length === 0) return { senales: 0 };
    return ctx.transaccion(async (tx) => {
      const ya = await tx.evento.count({
        where: { tipo: { in: TIPOS }, payload: { path: ["tramo"], equals: tramo } },
      });
      if (ya > 0) return { senales: 0 };
      for (const s of senales)
        await ctx.eventos.emitir(tx, { ...s, payload: { ...s.payload, tramo } });
      return { senales: senales.length };
    });
  },
});
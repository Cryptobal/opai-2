import { z } from "zod";

import { atrasoDeRonda, instanteLocal, tramosVencidos } from "@opai/domain";

import { zonaDelTenant } from "../core/turnos/comun";
import { defineTrabajo } from "../trabajos/registro";
import type { Contexto } from "../types";
import { noRealizadas, rondasRecientes, type Senal } from "./vigilancia-consultas";

const HORA_MS = 3_600_000;

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
 * Vigilancia horaria de Rondas (CAR-501): emite las señales que la Central convierte en alertas. Revisa la hora
 * anterior a `hora` («aaaa-mm-ddTHH» en la hora local del tenant, la que encola el programador): rondas programadas que no se
 * iniciaron, rondas que superaron su tiempo máximo y tramos vencidos con puntos obligatorios pendientes. La
 * ventana es fija por hora y el trabajo es único por hora, así que una señal sale una sola vez; todas van en una
 * transacción para que un reintento no las repita a medias.
 */
export const trabajoVigilanciaRondas = defineTrabajo({
  tipo: "rondas.vigilancia.revisar",
  descripcion:
    "Emite las señales de Rondas de la última hora: rondas programadas no iniciadas, rondas atrasadas y puntos obligatorios con el tramo vencido.",
  periodicidad: "horaria",
  payload: z.object({ hora: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}$/) }),
  async handler(ctx, { hora }) {
    if (!(await rondasActivo(ctx))) return { senales: 0 };
    const zona = await zonaDelTenant(ctx);
    const hasta = instanteLocal(hora.slice(0, 10), `${hora.slice(11, 13)}:00`, zona);
    const desde = new Date(hasta.getTime() - HORA_MS);
    const senales = [
      ...(await noRealizadas(ctx, desde, hasta, zona)),
      ...(await atrasosYTramos(ctx, desde, hasta)),
    ];
    if (senales.length > 0)
      await ctx.transaccion(async (tx) => {
        for (const s of senales) await ctx.eventos.emitir(tx, s);
      });
    return { senales: senales.length };
  },
});

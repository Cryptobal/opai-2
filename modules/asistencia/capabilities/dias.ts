import { z } from "zod";

import { defineConsumidor, defineTrabajo, type Contexto } from "@opai/capabilities";

import { consolidarYGuardar, fechaDe } from "./dias-calculo";
import { tenantBasico } from "./formato";

/** Fecha del día al que cuenta una marca: la del turno esperado si lo tiene; si no, la de su hora en la zona de la empresa. */
async function fechaDeMarca(ctx: Contexto, marcaId: string, zona: string): Promise<{ personaId: string; fechas: string[] } | null> {
  const m = await ctx.db.marca.findUnique({ where: { id: marcaId }, select: { personaId: true, horaServidor: true, horaDispositivo: true, origen: true, turnoEsperadoId: true } });
  if (!m) return null;
  const turno = m.turnoEsperadoId ? await ctx.db.turnoEsperado.findUnique({ where: { id: m.turnoEsperadoId }, select: { fecha: true } }) : null;
  return { personaId: m.personaId, fechas: [turno ? turno.fecha.toISOString().slice(0, 10) : fechaDe(m.origen === "contingencia" && m.horaDispositivo ? m.horaDispositivo : m.horaServidor, zona)] };
}

/** Mantiene `asistencia.dias` al día cuando cambia una marca o la respuesta a una corrección. Idempotente. */
export const consumidorDias = defineConsumidor({
  id: "asistencia.dias.actualizar",
  descripcion: "Recalcula el día consolidado de la persona cuando se registra una marca o se responde una corrección.",
  eventos: ["asistencia.marca.registrada", "asistencia.correccion.propuesta", "asistencia.correccion.respondida"],
  async handler(ctx, evento) {
    const p = z.object({ marcaId: z.string().uuid().optional(), correccionId: z.string().uuid().optional() }).safeParse(evento.payload);
    if (!p.success) return;
    const { zona } = await tenantBasico(ctx);
    let objetivo = p.data.marcaId ? await fechaDeMarca(ctx, p.data.marcaId, zona) : null;
    if (!objetivo && p.data.correccionId) {
      const c = await ctx.db.correccion.findUnique({ where: { id: p.data.correccionId }, select: { marcaId: true, horaPropuesta: true } });
      const base = c ? await fechaDeMarca(ctx, c.marcaId, zona) : null;
      objetivo = base && c ? { personaId: base.personaId, fechas: [...new Set([...base.fechas, fechaDe(c.horaPropuesta, zona)])] } : null;
    }
    if (!objetivo) return;
    for (const f of objetivo.fechas) await consolidarYGuardar(ctx, objetivo.personaId, f, new Date(), zona);
  },
});

const LOTE = 2000;

/**
 * Recalcula hoy y ayer de todo el que tenía turno esperado, para que el día sin marca pase a «ausente» al terminar el
 * turno aunque nadie marque. Los crons solo encolan (ADR-029); el reloj se inyecta para probarlo.
 */
export const trabajoRecalcularDias = defineTrabajo({
  tipo: "asistencia.dias.recalcular",
  descripcion: "Recalcula el día consolidado de hoy y de ayer de quienes tenían turno esperado.",
  payload: z.object({ ahora: z.string().datetime().optional() }),
  periodicidad: "horaria",
  async handler(ctx, p) {
    const ahora = p.ahora ? new Date(p.ahora) : new Date();
    const { zona } = await tenantBasico(ctx);
    const hoy = fechaDe(ahora, zona);
    const ayer = fechaDe(new Date(ahora.getTime() - 86_400_000), zona);
    const turnos = await ctx.db.turnoEsperado.findMany({
      where: { vigente: true, fecha: { in: [new Date(`${hoy}T00:00:00Z`), new Date(`${ayer}T00:00:00Z`)] } },
      select: { personaId: true, fecha: true }, take: LOTE,
    });
    const claves = [...new Set(turnos.map((t) => `${t.personaId}|${t.fecha.toISOString().slice(0, 10)}`))];
    for (const k of claves) {
      const [personaId, fecha] = k.split("|") as [string, string];
      await consolidarYGuardar(ctx, personaId, fecha, ahora, zona);
    }
    return { dias: claves.length };
  },
});

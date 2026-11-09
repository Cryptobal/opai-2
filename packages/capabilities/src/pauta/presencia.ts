import type { CeldaPauta, EstadoPresencia } from "@opai/domain";

import type { Contexto } from "../types";
import { fechaIso } from "./comun";

/**
 * Cruza la Pauta con las marcas legales (CAR-89): para cada celda con un turno esperado, la presencia es el día
 * consolidado de Asistencia (`asistencia.dias`) de la persona que cubre ese turno. La Pauta no calcula nada: lee el
 * mismo registro auditable que alimentan el RUT + PIN y el rostro, así que ambas vistas (diaria y mensual) y la
 * Asistencia dicen lo mismo. Sin el módulo activo, o sin día consolidado aún, la celda queda sin presencia.
 */
export async function agregarPresencia(
  ctx: Contexto,
  celdas: Map<string, CeldaPauta[]>,
  primero: Date,
  ultimo: Date,
): Promise<void> {
  // La presencia sale de las marcas: solo la ve quien puede ver Asistencia (no basta leer la Pauta).
  if (!ctx.modulosActivos.includes("asistencia") || !ctx.autorizar("asistencia:ver") || celdas.size === 0) return;
  const turnos = await ctx.db.turnoEsperado.findMany({
    where: { puestoId: { in: [...celdas.keys()] }, vigente: true, fecha: { gte: primero, lte: ultimo } },
    select: { puestoId: true, personaId: true, fecha: true, instalacionId: true },
  });
  if (turnos.length === 0) return;
  const personas = [...new Set(turnos.map((t) => t.personaId))];
  const dias = await ctx.db.dia.findMany({
    where: { personaId: { in: personas }, fecha: { gte: primero, lte: ultimo } },
    select: { personaId: true, fecha: true, estado: true, entrada: true, salida: true, segundosAtraso: true, instalacionId: true },
  });
  const diaDe = new Map(dias.map((d) => [`${d.personaId}|${fechaIso(d.fecha)}`, d]));
  const turnosDe = new Map<string, { personaId: string; instalacionId: string }[]>();
  for (const t of turnos) {
    const k = `${t.puestoId}|${fechaIso(t.fecha)}`;
    turnosDe.set(k, [...(turnosDe.get(k) ?? []), { personaId: t.personaId, instalacionId: t.instalacionId }]);
  }
  for (const [puestoId, lista] of celdas) {
    for (const c of lista) {
      const candidatas = turnosDe.get(`${puestoId}|${c.fecha}`);
      if (!candidatas?.length) continue;
      const cubre = c.cubiertoPorId ?? c.titularId;
      const turno = candidatas.find((t) => t.personaId === cubre) ?? candidatas[0]!;
      const personaId = turno.personaId;
      const d = diaDe.get(`${personaId}|${c.fecha}`);
      // El día consolidado debe ser de la instalación de este turno (una persona puede tener otro turno ese día).
      if (!d || (d.instalacionId && d.instalacionId !== turno.instalacionId)) continue;
      c.presencia = {
        personaId,
        estado: d.estado as EstadoPresencia,
        entrada: d.entrada?.toISOString() ?? null,
        salida: d.salida?.toISOString() ?? null,
        atrasoMin: Math.floor(d.segundosAtraso / 60),
      };
    }
  }
}

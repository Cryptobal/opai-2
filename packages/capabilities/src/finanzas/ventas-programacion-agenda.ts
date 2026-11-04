// Agenda, corte y próxima ejecución de una programación (BRIEF-26 · CAR-159).
import {
  type AgendaProgramacion,
  type CorteProgramacion,
  type FrecuenciaProgramacion,
  FRECUENCIAS_PROGRAMACION,
  periodosProgramacion,
  sumarDiasIso,
} from "@opai/domain";
import type { TenantTx } from "@opai/db";

import { dia, hoy } from "../core/maestros/comun";

export type ProgramacionAgenda = {
  id: string;
  frecuencia: string;
  diaGeneracion: number;
  diaSemana: number | null;
  mesDelAnio: number | null;
  fechaInicio: Date | null;
  fechaFin: Date | null;
  ultimoPeriodo10: string | null;
  createdAt: Date;
};

export function agendaDe(p: ProgramacionAgenda): AgendaProgramacion {
  const frecuencia = (FRECUENCIAS_PROGRAMACION as readonly string[]).includes(p.frecuencia)
    ? (p.frecuencia as FrecuenciaProgramacion)
    : "mensual";
  return {
    frecuencia,
    diaGeneracion: p.diaGeneracion,
    diaSemana: p.diaSemana,
    mesDelAnio: p.mesDelAnio,
    fechaInicio: dia(p.fechaInicio) ?? dia(p.createdAt) ?? hoy(),
    fechaFin: dia(p.fechaFin),
  };
}

type LectorCorte = Pick<TenantTx, "dteConfig" | "ventasProgramacionCorrida">;

/** Fecha de corte con 1.0 (Configuración DTE) más lo último que 1.0 facturó para esta programación. */
export async function corteDe(
  db: LectorCorte,
  tenantId: string,
  p: ProgramacionAgenda,
): Promise<CorteProgramacion> {
  const cfg = await db.dteConfig.findUnique({
    where: { tenantId },
    select: { fechaCorte1_0: true },
  });
  return { fechaCorte: dia(cfg?.fechaCorte1_0 ?? null), ultimoPeriodo10: p.ultimoPeriodo10 };
}

export async function periodosHechos(
  db: LectorCorte,
  programacionId: string,
): Promise<Set<string>> {
  const filas = await db.ventasProgramacionCorrida.findMany({
    where: { programacionId },
    select: { periodo: true },
  });
  return new Set(filas.map((f) => f.periodo));
}

/**
 * Ventana de recuperación: el trabajo diario solo genera períodos de los últimos 31 días. Un período
 * más antiguo se genera a mano (`generar` con `periodo`), para que activar una programación vieja
 * sin fecha de corte nunca dispare meses de facturas atrasadas.
 */
export const DIAS_RECUPERACION = 31;
export const desdeRecuperacion = (fechaHoy: string) => sumarDiasIso(fechaHoy, -DIAS_RECUPERACION);

/** Próxima fecha de generación dentro de la ventana (o null si la agenda terminó). */
export async function proximaEjecucionDe(
  db: LectorCorte,
  tenantId: string,
  p: ProgramacionAgenda,
): Promise<Date | null> {
  const h = hoy();
  const [sig] = periodosProgramacion(agendaDe(p), await corteDe(db, tenantId, p), {
    desde: desdeRecuperacion(h),
    hasta: sumarDiasIso(h, 800),
    hechos: await periodosHechos(db, p.id),
    limite: 1,
  });
  return sig ? new Date(`${sig.fecha}T00:00:00.000Z`) : null;
}

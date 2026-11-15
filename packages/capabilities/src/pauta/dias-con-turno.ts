// Días con turno de un período, leídos del consolidado de Asistencia (`asistencia.dias`), los turnos
// esperados del núcleo y las ausencias registradas en la Pauta. Lo usan los indicadores de Asistencia
// (CAR-311) y el informe de Operaciones por instalación: nunca las marcas ni su bitácora, y no tocan el
// reporte para la DT. Solo cuentan turnos ya terminados y cuyo turno esperado sigue vigente.
import { valoresEfectivos } from "../core/config";
import { campoAjuste } from "../core/config/catalogo";
import type { Contexto } from "../types";

/**
 * Siglas de ausencia que no cuentan ni a favor ni en contra en el ausentismo (CAR-311): licencias y
 * accidentes, pre y postnatal, vacaciones, permisos autorizados y ausencias justificadas. Cuentan en
 * contra solo la ausencia injustificada (A.I.) y el día con turno sin ninguna marca (S.A. o sin sigla).
 */
export const SIGLAS_NEUTRAS = new Set(["L.M.", "AT", "PREN.", "POSTN", "VAC", "P.G.R.", "P.S.G.R.", "A.J."]);

export type DiaConTurno = {
  personaId: string;
  instalacionId: string | null;
  fecha: string;
  /** "presente" | "incompleto" | "ausente" (un día sin marca con turno terminado cuenta como ausente). */
  estado: string;
  sigla: string | null;
  atraso: number;
  conEntrada: boolean;
};

const aFecha = (dia: string) => new Date(`${dia}T00:00:00Z`);

/** Días `[desde, hasta)` (aaaa-mm-dd) con turno terminado antes de `ahora`; `corte` limita las ausencias. */
export async function diasConTurno(
  ctx: Contexto,
  { desde, hasta, corte, ahora, personas }: { desde: string; hasta: string; corte: string; ahora: Date; personas?: readonly string[] | null | undefined },
): Promise<DiaConTurno[]> {
  const deQuien = personas ? { personaId: { in: [...personas] } } : {};
  const filas = await ctx.db.dia.findMany({
    where: {
      fecha: { gte: aFecha(desde), lt: aFecha(hasta) },
      turnoEsperadoId: { not: null },
      estado: { in: ["presente", "incompleto", "ausente", "sin_marca"] },
      ...deQuien,
    },
    select: { personaId: true, fecha: true, estado: true, sigla: true, entrada: true, segundosAtraso: true, turnoEsperadoId: true },
  });
  const turnos = new Map(
    (
      await ctx.db.turnoEsperado.findMany({
        where: { id: { in: filas.flatMap((f) => (f.turnoEsperadoId ? [f.turnoEsperadoId] : [])) }, vigente: true },
        select: { id: true, fin: true, instalacionId: true },
      })
    ).map((t) => [t.id, t]),
  );
  const dias: DiaConTurno[] = [];
  for (const f of filas) {
    const t = f.turnoEsperadoId ? turnos.get(f.turnoEsperadoId) : undefined;
    if (!t || t.fin > ahora) continue;
    // Un día con turno que ya terminó y sigue sin marca es un día sin marca (S.A.).
    const estado = f.estado === "sin_marca" ? "ausente" : f.estado;
    const fecha = f.fecha.toISOString().slice(0, 10);
    dias.push({ personaId: f.personaId, instalacionId: t.instalacionId, fecha, estado, sigla: f.sigla, atraso: f.segundosAtraso, conEntrada: f.entrada !== null });
  }
  // Ausencias registradas en la Pauta: anulan el turno, pero cuentan en contra (A.I.).
  const ausencias = await ctx.db.excepcionPauta.findMany({
    where: { tipo: "ausencia", estado: "activa", fecha: { gte: aFecha(desde), lt: aFecha(corte) }, ...(personas ? deQuien : { personaId: { not: null } }) },
    select: { personaId: true, fecha: true, puestoId: true },
  });
  const instalacionDe = new Map(
    (
      await ctx.db.puesto.findMany({
        where: { id: { in: [...new Set(ausencias.map((a) => a.puestoId))] } },
        select: { id: true, instalacionId: true },
      })
    ).map((p) => [p.id, p.instalacionId]),
  );
  const vistos = new Set(dias.map((d) => `${d.personaId}:${d.fecha}`));
  for (const a of ausencias) {
    const fecha = a.fecha.toISOString().slice(0, 10);
    if (!a.personaId || vistos.has(`${a.personaId}:${fecha}`)) continue;
    vistos.add(`${a.personaId}:${fecha}`);
    dias.push({ personaId: a.personaId, instalacionId: instalacionDe.get(a.puestoId) ?? null, fecha, estado: "ausente", sigla: "A.I.", atraso: 0, conEntrada: false });
  }
  return dias;
}

/** ¿El día cuenta en contra en el ausentismo? null = no cuenta (justificado). */
export function ausenteSinJustificar(d: DiaConTurno): boolean | null {
  if (d.estado !== "ausente") return false;
  return d.sigla && SIGLAS_NEUTRAS.has(d.sigla) ? null : true;
}

/** Tolerancia de atraso de la empresa en segundos (ajuste de Asistencia; 15 min si no está declarado). */
export async function toleranciaAtrasoS(ctx: Contexto): Promise<number> {
  const campo = campoAjuste("asistencia", "tolerancia_atraso_min");
  if (!campo) return 15 * 60;
  const v = (await valoresEfectivos(ctx, [campo])).get("asistencia.tolerancia_atraso_min")?.valor;
  return (typeof v === "number" ? v : 15) * 60;
}

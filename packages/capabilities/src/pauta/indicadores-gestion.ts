// Indicador de gestión que Pauta publica en el catálogo del núcleo (ADR-094, adenda CAR-309): días
// para cubrir una vacante. Un puesto queda sin persona desde que rige una serie sin titular o desde
// que su titular dejó la empresa, y se cubre cuando rige la siguiente serie con titular. Se atribuye a quien reclutó a la persona que lo tomó
// («Reclutado por» de su contrato); si nadie figura, la vacante no se atribuye.
import { diaEnZona, sumarDias } from "@opai/domain";

import { defineIndicador, type IndicadorGestion, type MedicionIndicador } from "../indicadores-gestion";
import type { Contexto } from "../types";
import { indicadoresCobertura } from "./indicadores-cobertura";

const aDia = (d: Date) => d.toISOString().slice(0, 10);
const aFecha = (dia: string) => new Date(`${dia}T00:00:00Z`);
const diasEntre = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);

type Cubierta = { titular: string; cubierta: string; dias: number };
type Serie = { puestoId: string; vigenteDesde: Date; titularPersonaId: string | null };
type Vinculo = { personaId: string; inicio: Date; termino: Date | null; estado: string; reclutadoPorId: string | null };

/**
 * Día en que `personaId` dejó la empresa entre `desde` (incl.) y `hasta` (excl.): término de un
 * contrato sin otro que empiece al día siguiente (un traslado no es una salida). null si no salió.
 */
function salida(vinculos: readonly Vinculo[], personaId: string, desde: string, hasta: string): string | null {
  const propios = vinculos.filter((v) => v.personaId === personaId);
  for (const v of propios) {
    if (v.estado !== "terminado" || !v.termino) continue;
    const termino = aDia(v.termino);
    if (termino < desde || termino >= hasta) continue;
    const sigue = propios.some((x) => x.inicio > v.inicio && aDia(x.inicio) <= sumarDias(termino, 1));
    if (!sigue) return termino;
  }
  return null;
}

/**
 * Vacantes cubiertas entre `desde` (incl.) y `hasta` (excl.). Un puesto queda sin persona desde que
 * rige una serie sin titular o desde el día siguiente a que su titular dejó la empresa (lo que pase
 * antes), y se cubre cuando rige la serie con el nuevo titular.
 */
function vacantesCubiertas(series: readonly Serie[], vinculos: readonly Vinculo[], desde: string, hasta: string): Cubierta[] {
  const out: Cubierta[] = [];
  for (const c of series) {
    const cubierta = aDia(c.vigenteDesde);
    if (!c.titularPersonaId || cubierta < desde || cubierta >= hasta) continue;
    const antes = series.filter((s) => s.puestoId === c.puestoId && s.vigenteDesde < c.vigenteDesde);
    let i = antes.length - 1;
    while (i >= 0 && antes[i]?.titularPersonaId === null) i -= 1;
    const racha = antes[i + 1];
    const previa = antes[i];
    let apertura = i < antes.length - 1 && racha ? aDia(racha.vigenteDesde) : null;
    // El titular anterior se fue antes de que alguien fijara la serie sin titular (o la nueva).
    if (previa?.titularPersonaId && previa.titularPersonaId !== c.titularPersonaId) {
      const fin = apertura ?? cubierta;
      const salio = salida(vinculos, previa.titularPersonaId, aDia(previa.vigenteDesde), fin);
      if (salio) apertura = sumarDias(salio, 1);
    }
    if (apertura === null || apertura >= cubierta) continue;
    out.push({ titular: c.titularPersonaId, cubierta, dias: diasEntre(apertura, cubierta) });
  }
  return out;
}

/**
 * «Reclutado por» del contrato con que la persona tomó el puesto: el vigente ese día; si no hay, el
 * último que empezó antes; si tampoco, el primero que empezó después.
 */
function reclutadorDe(vinculos: readonly Vinculo[], v: Cubierta): string | null {
  const propios = vinculos
    .filter((x) => x.personaId === v.titular)
    .sort((a, b) => (a.inicio < b.inicio ? -1 : 1));
  const vigente = propios.find(
    (x) => aDia(x.inicio) <= v.cubierta && (!x.termino || aDia(x.termino) >= v.cubierta),
  );
  const antes = propios.filter((x) => aDia(x.inicio) <= v.cubierta).at(-1);
  const despues = propios.find((x) => aDia(x.inicio) > v.cubierta);
  return (vigente ?? antes ?? despues)?.reclutadoPorId ?? null;
}

async function leer(ctx: Contexto, desde: string, hasta: string) {
  const cierres = await ctx.db.seriePauta.findMany({
    where: { titularPersonaId: { not: null }, vigenteDesde: { gte: aFecha(desde), lt: aFecha(hasta) } },
    select: { puestoId: true },
  });
  if (cierres.length === 0) return { series: [], vinculos: [] };
  const series = await ctx.db.seriePauta.findMany({
    where: { puestoId: { in: [...new Set(cierres.map((c) => c.puestoId))] }, vigenteDesde: { lt: aFecha(hasta) } },
    select: { puestoId: true, vigenteDesde: true, titularPersonaId: true },
    orderBy: { vigenteDesde: "asc" },
  });
  const personas = [...new Set(series.flatMap((s) => (s.titularPersonaId ? [s.titularPersonaId] : [])))];
  const vinculos = await ctx.db.vinculoLaboral.findMany({
    where: { personaId: { in: personas } },
    select: { personaId: true, inicio: true, termino: true, estado: true, reclutadoPorId: true },
  });
  return { series, vinculos };
}

export const indicadorDiasCubrirVacante = defineIndicador({
  id: "pauta.dias_cubrir_vacante",
  nombre: "Días para cubrir una vacante",
  descripcion:
    "Promedio de días que estuvieron sin persona los puestos que se cubrieron en el período: desde que el puesto quedó sin titular en la pauta o su titular dejó la empresa, hasta que lo tomó alguien. Se atribuye a quien reclutó a la persona que lo tomó.",
  tipo: "oportunidad",
  unidad: "dias",
  sentido: "menor",
  sujeto: "usuario",
  metaSugerida: 7,
  origen: "series de la pauta (titular de cada puesto) y quién reclutó a cada persona",
  permiso: "pauta:read",
  async medir(ctx, { rango, sujetos, zona, ahora }) {
    const hoy = diaEnZona(ahora, zona);
    const hasta = diaEnZona(rango.hasta, zona);
    // Lo que todavía no rige no está cubierto: en el mes en curso, el corte es mañana (incluye hoy).
    const corte = hoy < hasta ? sumarDias(hoy, 1) : hasta;
    const desde = diaEnZona(rango.desde, zona);
    const { series, vinculos } = await leer(ctx, desde, corte);
    const vacantes = vacantesCubiertas(series, vinculos, desde, corte);
    const suma = new Map<string, { dias: number; n: number }>();
    for (const v of vacantes) {
      const r = reclutadorDe(vinculos, v);
      if (!r || (sujetos && !sujetos.includes(r))) continue;
      const s = suma.get(r) ?? { dias: 0, n: 0 };
      suma.set(r, { dias: s.dias + v.dias, n: s.n + 1 });
    }
    return [...suma].map(
      ([sujetoId, s]): MedicionIndicador => ({ sujetoId, valor: Math.round((s.dias / s.n) * 10) / 10 }),
    );
  },
});

export const indicadoresPauta: readonly IndicadorGestion[] = [indicadorDiasCubrirVacante, ...indicadoresCobertura];

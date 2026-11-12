// Indicador de gestión que Pauta publica en el catálogo del núcleo (ADR-094, adenda CAR-309): días
// para cubrir una vacante. Un puesto queda vacante desde que rige una serie sin titular y se cubre
// cuando rige la siguiente serie con titular. Se atribuye a quien reclutó a la persona que lo tomó
// («Reclutado por» de su contrato); si nadie figura, la vacante no se atribuye.
import { diaEnZona } from "@opai/domain";

import { defineIndicador, type IndicadorGestion, type MedicionIndicador } from "../indicadores-gestion";
import type { Contexto } from "../types";

const aDia = (d: Date) => d.toISOString().slice(0, 10);
const aFecha = (dia: string) => new Date(`${dia}T00:00:00Z`);
const diasEntre = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);

type Cubierta = { titular: string; cubierta: string; dias: number };

/** Vacantes que se cubrieron entre `desde` (incl.) y `hasta` (excl.), con sus días abiertas. */
async function vacantesCubiertas(ctx: Contexto, desde: string, hasta: string): Promise<Cubierta[]> {
  const cierres = await ctx.db.seriePauta.findMany({
    where: { titularPersonaId: { not: null }, vigenteDesde: { gte: aFecha(desde), lt: aFecha(hasta) } },
    select: { puestoId: true, vigenteDesde: true, titularPersonaId: true },
  });
  if (cierres.length === 0) return [];
  const series = await ctx.db.seriePauta.findMany({
    where: { puestoId: { in: [...new Set(cierres.map((c) => c.puestoId))] }, vigenteDesde: { lt: aFecha(hasta) } },
    select: { puestoId: true, vigenteDesde: true, titularPersonaId: true },
    orderBy: { vigenteDesde: "asc" },
  });
  const out: Cubierta[] = [];
  for (const c of cierres) {
    const antes = series.filter((s) => s.puestoId === c.puestoId && s.vigenteDesde < c.vigenteDesde);
    // La serie anterior tiene que ser sin titular; la vacante se abrió en la primera de esa racha.
    let i = antes.length - 1;
    while (i >= 0 && antes[i]?.titularPersonaId === null) i -= 1;
    const apertura = antes[i + 1];
    if (!apertura || i === antes.length - 1 || !c.titularPersonaId) continue;
    const cubierta = aDia(c.vigenteDesde);
    out.push({ titular: c.titularPersonaId, cubierta, dias: diasEntre(aDia(apertura.vigenteDesde), cubierta) });
  }
  return out;
}

/** «Reclutado por» del contrato con que cada persona tomó el puesto: el último que empezó a esa fecha. */
async function reclutadores(ctx: Contexto, vacantes: readonly Cubierta[]): Promise<Map<Cubierta, string>> {
  const vinculos = await ctx.db.vinculoLaboral.findMany({
    where: { personaId: { in: [...new Set(vacantes.map((v) => v.titular))] } },
    select: { personaId: true, inicio: true, reclutadoPorId: true },
    orderBy: { inicio: "desc" },
  });
  const out = new Map<Cubierta, string>();
  for (const v of vacantes) {
    const propios = vinculos.filter((x) => x.personaId === v.titular);
    const vinculo = propios.find((x) => aDia(x.inicio) <= v.cubierta) ?? propios.at(-1);
    if (vinculo?.reclutadoPorId) out.set(v, vinculo.reclutadoPorId);
  }
  return out;
}

export const indicadorDiasCubrirVacante = defineIndicador({
  id: "pauta.dias_cubrir_vacante",
  nombre: "Días para cubrir una vacante",
  descripcion:
    "Promedio de días que estuvieron sin titular los puestos que se cubrieron en el período, desde que el puesto quedó sin titular en la pauta hasta que lo tomó alguien. Se atribuye a quien reclutó a la persona que lo tomó.",
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
    // Lo que todavía no rige no está cubierto: el corte es hoy si el mes está en curso.
    const corte = hoy < hasta ? diaEnZona(new Date(ahora.getTime() + 86_400_000), zona) : hasta;
    const vacantes = await vacantesCubiertas(ctx, diaEnZona(rango.desde, zona), corte);
    if (vacantes.length === 0) return [];
    const quien = await reclutadores(ctx, vacantes);
    const suma = new Map<string, { dias: number; n: number }>();
    for (const v of vacantes) {
      const r = quien.get(v);
      if (!r || (sujetos && !sujetos.includes(r))) continue;
      const s = suma.get(r) ?? { dias: 0, n: 0 };
      suma.set(r, { dias: s.dias + v.dias, n: s.n + 1 });
    }
    return [...suma].map(
      ([sujetoId, s]): MedicionIndicador => ({ sujetoId, valor: Math.round((s.dias / s.n) * 10) / 10 }),
    );
  },
});

export const indicadoresPauta: readonly IndicadorGestion[] = [indicadorDiasCubrirVacante];

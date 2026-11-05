import { derivarTurnosDeJornada, type JornadaPactada, type TurnoEsperadoDerivado } from "@opai/domain";

import type { Contexto } from "../../types";
import { feriadosDelMes } from "../../pauta/feriados";
import { reconciliar, resumenVacio, sumar, type Resumen } from "./reconciliar";
import { zonaDelTenant } from "./comun";

const fecha = (d: Date) => d.toISOString().slice(0, 10);

export type ResultadoJornada = Resumen & { avisos: { personaId: string; motivo: string }[] };

/**
 * Turnos esperados de las empresas sin Pauta: salen del vínculo laboral vigente de cada persona (su
 * `distribucion` y el horario del puesto) y, si el vínculo no la trae, de la jornada DT. Sin datos
 * suficientes no inventa nada: devuelve un aviso por persona.
 */
export async function regenerarJornada(
  ctx: Contexto, desde: string, hasta: string, personaIds?: readonly string[], simular = false,
): Promise<ResultadoJornada> {
  const zona = await zonaDelTenant(ctx);
  const vinculos = await ctx.db.vinculoLaboral.findMany({
    where: {
      estado: "vigente",
      instalacionId: { not: null },
      inicio: { lte: new Date(`${hasta}T00:00:00.000Z`) },
      OR: [{ termino: null }, { termino: { gte: new Date(`${desde}T00:00:00.000Z`) } }],
      ...(personaIds ? { personaId: { in: [...personaIds] } } : {}),
    },
    select: {
      personaId: true, instalacionId: true, puestoId: true, inicio: true, termino: true, distribucion: true,
      puesto: { select: { horaInicio: true, horaFin: true, colacionMin: true, colacionFuera: true } },
    },
  });
  const dt = await ctx.db.personaJornadaDt.findMany({
    where: { personaId: { in: vinculos.map((v) => v.personaId) } },
    select: { personaId: true, distribucion: true },
  });
  const dtPorPersona = new Map(dt.map((d) => [d.personaId, d.distribucion]));
  const jornadas: JornadaPactada[] = vinculos.map((v) => ({
    personaId: v.personaId,
    instalacionId: v.instalacionId!,
    puestoId: v.puestoId,
    inicioVinculo: fecha(v.inicio),
    terminoVinculo: v.termino ? fecha(v.termino) : null,
    distribucion: v.distribucion?.trim() || dtPorPersona.get(v.personaId) || null,
    horarioPuesto: v.puesto ? { horaInicio: v.puesto.horaInicio, horaFin: v.puesto.horaFin } : null,
    colacionMin: v.puesto && !v.puesto.colacionFuera ? v.puesto.colacionMin : 0,
  }));

  const instalaciones = await ctx.db.instalacion.findMany({
    where: { id: { in: [...new Set(jornadas.map((j) => j.instalacionId))] } },
    select: { id: true, region: true },
  });
  const feriados = new Map<string, Map<string, string>>();
  for (const [anio, mes] of [...new Set(rangoMeses(desde, hasta))].map((k) => k.split("-").map(Number) as [number, number])) {
    for (const [inst, dias] of await feriadosDelMes(ctx, anio, mes, instalaciones)) {
      const acumulado = feriados.get(inst) ?? new Map<string, string>();
      for (const [f, n] of dias) acumulado.set(f, n);
      feriados.set(inst, acumulado);
    }
  }

  const salida = { ...resumenVacio(), avisos: [] as { personaId: string; motivo: string }[] };
  // Una vez por persona: con dos vínculos vigentes se juntan sus turnos para no anularse entre sí.
  const turnosPorPersona = new Map<string, TurnoEsperadoDerivado[]>();
  for (const j of jornadas) {
    const r = derivarTurnosDeJornada([j], desde, hasta, zona, (f) => feriados.get(j.instalacionId)?.has(f) ?? false);
    salida.avisos.push(...r.avisos);
    const acumulado = turnosPorPersona.get(j.personaId) ?? [];
    for (const t of r.turnos)
      if (!acumulado.some((x) => x.inicio.getTime() === t.inicio.getTime())) acumulado.push(t);
    turnosPorPersona.set(j.personaId, acumulado);
  }
  // Quien tenía turnos de jornada pactada y ya no tiene vínculo vigente: se anulan (sin fantasmas).
  const huerfanos = await ctx.db.turnoEsperado.findMany({
    where: {
      vigente: true, origen: "jornada_pactada",
      fecha: { gte: new Date(`${desde}T00:00:00.000Z`), lte: new Date(`${hasta}T00:00:00.000Z`) },
      ...(personaIds ? { personaId: { in: [...personaIds] } } : {}),
    },
    select: { personaId: true },
    distinct: ["personaId"],
  });
  for (const h of huerfanos) if (!turnosPorPersona.has(h.personaId)) turnosPorPersona.set(h.personaId, []);
  for (const [personaId, turnos] of turnosPorPersona) {
    const resumen = await ctx.transaccion((tx) =>
      reconciliar(tx, ctx.tenantId, { origen: "jornada_pactada", personaIds: [personaId], desde, hasta }, turnos, simular),
    );
    Object.assign(salida, sumar(salida, resumen));
  }
  return salida;
}

function rangoMeses(desde: string, hasta: string): string[] {
  const salida: string[] = [];
  let [y, m] = desde.split("-").map(Number) as [number, number];
  const [yf, mf] = hasta.split("-").map(Number) as [number, number];
  while (y < yf || (y === yf && m <= mf)) {
    salida.push(`${y}-${m}`);
    if (m === 12) { y += 1; m = 1; } else m += 1;
  }
  return salida;
}

// Datos para `nomina.costo_proyectado.listar` (CAR-344): vínculos, capas de sueldo, previsión y reglas
// de anticipo, leídos una sola vez para todo el rango. Los montos de sueldo solo se usan con
// core:estructuras.read_sensible (`ocultasDe`, que además audita la lectura), como la rentabilidad.
import {
  juegoDeValores,
  normalizarAfp,
  resolverEstructura,
  UF_ESCALA,
  type JuegoDeValores,
  type MesCalendario,
  type ModoAnticipo,
  type PersonaACostear,
} from "@opai/domain";

import type { Contexto } from "../types";
import { instalacionesEnAlcance } from "../core/maestros/alcance";
import { aFecha, dia } from "../core/maestros/comun";
import { dondeEstructura } from "../core/maestros/estructuras-alcance";
import { ocultasDe } from "../core/maestros/estructuras-lectura";
import { aDominio } from "../core/maestros/estructuras-vista";
import { clavesFaltantes, publicacionesParaFecha } from "../core/remuneraciones";

const pad = (n: number) => String(n).padStart(2, "0");
export const inicioMes = (m: MesCalendario) => `${m.anio}-${pad(m.mes)}-01`;
export const finMes = (m: MesCalendario) =>
  `${m.anio}-${pad(m.mes)}-${pad(new Date(Date.UTC(m.anio, m.mes, 0)).getUTCDate())}`;

/** Juego legal de la fecha, o el primer indicador que falta. */
export async function juegoDelMes(ctx: Contexto, fecha: string): Promise<JuegoDeValores | string> {
  const valores = await publicacionesParaFecha(ctx, fecha);
  const falta = clavesFaltantes(fecha, valores)[0];
  if (falta) return falta;
  try {
    return await juegoDeValores(fecha, valores);
  } catch {
    return "indicadores";
  }
}

/** Todo lo que se necesita del rango, en cinco consultas. */
export async function cargarBase(ctx: Contexto, desde: string, hasta: string) {
  const alcance = instalacionesEnAlcance(ctx);
  // Del más reciente al más antiguo: si una persona tiene dos vínculos en un mes, manda el último.
  const vinculos = await ctx.db.vinculoLaboral.findMany({
    orderBy: [{ inicio: "desc" }, { id: "asc" }],
    where: {
      ...(alcance ? { instalacionId: { in: [...alcance] } } : {}),
      tipo: { not: "honorarios" },
      inicio: { lte: aFecha(hasta) },
      OR: [{ termino: null }, { termino: { gte: aFecha(desde) } }],
    },
    select: { personaId: true, tipo: true, inicio: true, termino: true, puestoId: true, instalacionId: true, horasSemanales: true },
  });
  const personas = [...new Set(vinculos.map((v) => v.personaId))];
  const ref = (k: "puestoId" | "instalacionId") => [...new Set(vinculos.flatMap((v) => (v[k] ? [v[k]] : [])))];
  const [estructuras, previsiones, anticipos] = vinculos.length === 0 ? [[], [], []] : await Promise.all([
    ctx.db.estructuraSueldo.findMany({
      where: {
        estado: "vigente",
        vigenteDesde: { lte: aFecha(hasta) },
        OR: [
          { nivel: "persona", personaId: { in: personas } },
          { nivel: "puesto", puestoId: { in: ref("puestoId") } },
          { nivel: "instalacion", instalacionId: { in: ref("instalacionId") } },
        ],
        AND: [await dondeEstructura(ctx), { OR: [{ vigenteHasta: null }, { vigenteHasta: { gte: aFecha(desde) } }] }],
      },
      include: { items: { orderBy: { orden: "asc" } } },
    }),
    ctx.db.personaPrevision.findMany({
      where: { personaId: { in: personas } },
      select: { personaId: true, afp: true, sistemaSalud: true, planUf: true },
    }),
    ctx.db.nominaReglaAnticipo.findMany({ where: { activa: true, personaId: { in: personas } } }),
  ]);
  // Capas por «nivel:id», una sola vez, para no recorrer todas por persona y mes.
  const capas = new Map<string, ReturnType<typeof aDominio>[]>();
  for (const e of estructuras) {
    const k = `${e.nivel}:${e.personaId ?? e.puestoId ?? e.instalacionId}`;
    capas.set(k, [...(capas.get(k) ?? []), aDominio(e, e.items)]);
  }
  return { vinculos, estructuras, capas, previsiones, anticipos };
}

export type Base = Awaited<ReturnType<typeof cargarBase>>;

/** Días del mes con vínculo vigente en base 30: 30 menos los días calendario fuera del vínculo. */
export function diasDelVinculo(ini: string, fin: string, inicio: string, termino: string | null): number {
  const dias = (a: string, b: string) => Math.max(0, Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000));
  const fuera = (inicio > ini ? dias(ini, inicio) : 0) + (termino && termino < fin ? dias(termino, fin) : 0);
  return Math.max(0, 30 - fuera);
}

export type PersonaDelMes = PersonaACostear & { personaId: string; diasVinculo: number };

/** Quienes tienen vínculo en el mes, con su capa al último día; `ocultas` y `sinCapa` sin identificar. */
export function personasDelMes(base: Base, m: MesCalendario, ocultas: Map<string, boolean>) {
  const [ini, fin] = [inicioMes(m), finMes(m)];
  const prevision = new Map(base.previsiones.map((p) => [p.personaId, p]));
  const anticipo = new Map(base.anticipos.map((a) => [a.personaId, a]));
  const personas: PersonaDelMes[] = [];
  const omitidas: { personaId: string; motivo: "sin_capa" | "oculta" }[] = [];
  let sinCapa = 0;
  let ocultasMes = 0;
  const vistas = new Set<string>();
  for (const v of base.vinculos) {
    if ((dia(v.inicio) ?? "") > fin || (v.termino && (dia(v.termino) ?? "") < ini) || vistas.has(v.personaId)) continue;
    vistas.add(v.personaId);
    const de = (nivel: string, id: string | null) => (id ? (base.capas.get(`${nivel}:${id}`) ?? []) : []);
    const r = resolverEstructura(fin, {
      persona: de("persona", v.personaId),
      puesto: de("puesto", v.puestoId),
      instalacion: de("instalacion", v.instalacionId),
    });
    if (!r.estructura) { sinCapa += 1; omitidas.push({ personaId: v.personaId, motivo: "sin_capa" }); continue; }
    if (ocultas.get(r.estructura.id)) { ocultasMes += 1; omitidas.push({ personaId: v.personaId, motivo: "oculta" }); continue; }
    const p = prevision.get(v.personaId);
    const a = anticipo.get(v.personaId);
    const planUf = p?.planUf ? Math.round(Number(p.planUf) * UF_ESCALA) : 0;
    personas.push({
      personaId: v.personaId,
      diasVinculo: diasDelVinculo(ini, fin, dia(v.inicio) ?? ini, dia(v.termino)),
      capa: r.estructura,
      contrato: v.tipo === "indefinido" ? "indefinido" : "plazo_fijo",
      afp: normalizarAfp(p?.afp) ?? "modelo",
      salud: p?.sistemaSalud === "isapre" && planUf > 0 ? { tipo: "isapre", planUf } : { tipo: "fonasa" },
      jornadaMinutosSemanales: (v.horasSemanales ?? 42) * 60,
      anticipo: a ? { modo: a.modo as ModoAnticipo, valor: a.valor, diaMes: a.diaMes } : null,
    });
  }
  return { personas, omitidas, sinCapa, ocultas: ocultasMes };
}

export { ocultasDe };

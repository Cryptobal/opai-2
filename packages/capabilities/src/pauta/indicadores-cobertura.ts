// Indicadores de Pauta por instalación (ADR-094, adenda CAR-310): cobertura, turnos descubiertos y
// turnos extra del mes. Se cargan a quien responde por la instalación: el supervisor que la tiene a
// cargo y el jefe de zona por las de los supervisores que le reportan (decisión de Carlos, 12-nov-2026).
import { porcentajeDe, resumirCobertura } from "@opai/domain";

import { instalacionesPorResponsable } from "../core/jefatura/empresa";
import {
  defineIndicador,
  type ConsultaIndicador,
  type IndicadorGestion,
  type MedicionIndicador,
} from "../indicadores-gestion";
import type { Contexto } from "../types";
import { cargarMes } from "./cargar";

type Cifras = { programados: number; cubiertos: number; ppc: number; extra: number };

/** Cifras del mes por usuario responsable, sumando sus instalaciones. */
async function cifrasPorResponsable(ctx: Contexto, { rango, sujetos }: ConsultaIndicador) {
  const responsables = await instalacionesPorResponsable(ctx);
  const elegidos = [...responsables].filter(([u]) => !sujetos || sujetos.includes(u));
  const ids = [...new Set(elegidos.flatMap(([, s]) => [...s]))];
  if (ids.length === 0) return new Map<string, Cifras>();
  const [instalaciones, puestos] = await Promise.all([
    ctx.db.instalacion.findMany({ where: { id: { in: ids }, archivadaEn: null }, select: { id: true, region: true } }),
    ctx.db.puesto.findMany({ where: { estado: "activo", instalacionId: { in: ids } }, select: { id: true, instalacionId: true } }),
  ]);
  const [anio, mes] = rango.periodo.split("-").map(Number) as [number, number];
  const m = await cargarMes(ctx, puestos, instalaciones, anio, mes);
  const porInstalacion = new Map<string, Cifras>();
  for (const i of instalaciones) {
    const celdas = puestos.filter((p) => p.instalacionId === i.id).flatMap((p) => m.celdas.get(p.id) ?? []);
    const r = resumirCobertura(celdas);
    const extra = celdas.filter(
      (c) => c.estado === "cubierto" && (c.variante === "refuerzo" || c.variante === "refuerzo_extra"),
    ).length;
    porInstalacion.set(i.id, { programados: r.programados, cubiertos: r.cubiertos, ppc: r.ppc, extra });
  }
  const out = new Map<string, Cifras>();
  for (const [usuario, suyas] of elegidos) {
    const total: Cifras = { programados: 0, cubiertos: 0, ppc: 0, extra: 0 };
    for (const id of suyas) {
      const c = porInstalacion.get(id);
      if (!c) continue;
      total.programados += c.programados;
      total.cubiertos += c.cubiertos;
      total.ppc += c.ppc;
      total.extra += c.extra;
    }
    if (total.programados > 0 || total.extra > 0) out.set(usuario, total);
  }
  return out;
}

const medirCon =
  (valor: (c: Cifras) => number | null) =>
  async (ctx: Contexto, consulta: ConsultaIndicador): Promise<readonly MedicionIndicador[]> =>
    [...(await cifrasPorResponsable(ctx, consulta))].map(([sujetoId, c]) => ({ sujetoId, valor: valor(c) }));

const comun = {
  sujeto: "usuario" as const,
  permiso: "pauta:read",
  origen: "pauta del mes (series, excepciones y coberturas) de las instalaciones a cargo",
};

export const indicadoresCobertura: readonly IndicadorGestion[] = [
  defineIndicador({
    ...comun,
    id: "pauta.cobertura",
    nombre: "Cobertura de pauta",
    descripcion:
      "En las instalaciones por las que responde (a cargo como supervisor o de los supervisores que le reportan), qué porcentaje de los turnos programados del mes quedó cubierto.",
    tipo: "resultado",
    unidad: "porcentaje",
    sentido: "mayor",
    metaSugerida: 98,
    medir: medirCon((c) => porcentajeDe(c.cubiertos, c.programados)),
  }),
  defineIndicador({
    ...comun,
    id: "pauta.turnos_descubiertos",
    nombre: "Turnos descubiertos",
    descripcion:
      "Cantidad de turnos que quedaron como puesto por cubrir en el mes en las instalaciones por las que responde.",
    tipo: "resultado",
    unidad: "cantidad",
    sentido: "menor",
    metaSugerida: 2,
    medir: medirCon((c) => c.ppc),
  }),
  defineIndicador({
    ...comun,
    id: "pauta.turnos_extra",
    nombre: "Turnos extra sobre la pauta",
    descripcion:
      "Turnos de refuerzo cubiertos en el mes, como porcentaje de los turnos programados, en las instalaciones por las que responde.",
    tipo: "calidad",
    unidad: "porcentaje",
    sentido: "menor",
    metaSugerida: 5,
    medir: medirCon((c) => porcentajeDe(c.extra, c.programados)),
  }),
];

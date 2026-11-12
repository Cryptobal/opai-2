import { diaEnZona, PERMISOS_CORE, porcentajeDe } from "@opai/domain";

import { defineIndicador, type MedicionIndicador } from "../../indicadores-gestion";
import type { Contexto } from "../../types";
import { directasPorJefatura } from "../jefatura/empresa";

const LOTE = 5000;

/**
 * Personas (de `ids`) con algún documento vencido al corte: vinculado a su ficha, no archivado y sin
 * una versión nueva que lo reemplace. `corte` es un día aaaa-mm-dd: vence antes de ese día = vencido.
 */
async function conVencidos(
  ctx: Contexto,
  ids: readonly string[],
  corte: string,
): Promise<Set<string>> {
  const out = new Set<string>();
  for (let i = 0; i < ids.length; i += LOTE) {
    const vinculos = await ctx.db.documentoVinculo.findMany({
      where: {
        entidadTipo: "persona",
        entidadId: { in: ids.slice(i, i + LOTE) },
        documento: { venceEn: { lt: new Date(`${corte}T00:00:00Z`) }, estado: { not: "archivado" } },
      },
      select: { entidadId: true, documentoId: true },
    });
    if (vinculos.length === 0) continue;
    const reemplazados = await ctx.db.documento.findMany({
      where: { reemplazaAId: { in: vinculos.map((v) => v.documentoId) }, estado: { not: "archivado" } },
      select: { reemplazaAId: true },
    });
    const viejos = new Set(reemplazados.map((d) => d.reemplazaAId));
    for (const v of vinculos) if (!viejos.has(v.documentoId)) out.add(v.entidadId);
  }
  return out;
}

/**
 * Indicador de Personas (ADR-094, CAR-309): de las personas a cargo directo de una jefatura, qué
 * porcentaje no tiene ningún documento vencido al cierre del mes (o hoy, en el mes en curso).
 */
export const indicadorDocumentosAlDia = defineIndicador({
  id: "core.personas_documentos_al_dia",
  nombre: "Fichas con documentos al día",
  descripcion:
    "De las personas a su cargo directo, qué porcentaje no tiene ningún documento vencido en su ficha al cierre del mes (en el mes en curso, a hoy). Un documento reemplazado por una versión nueva no cuenta.",
  tipo: "calidad",
  unidad: "porcentaje",
  sentido: "mayor",
  sujeto: "persona",
  metaSugerida: 95,
  origen: "jefatura de cada cargo y vencimiento de los documentos de cada ficha",
  permiso: PERMISOS_CORE.documentosRead,
  async medir(ctx, { rango, sujetos, zona, ahora }) {
    const equipos = await directasPorJefatura(ctx);
    const jefes = sujetos ? [...equipos.keys()].filter((j) => sujetos.includes(j)) : [...equipos.keys()];
    if (jefes.length === 0) return [];
    const personas = [...new Set(jefes.flatMap((j) => [...(equipos.get(j) ?? [])]))];
    const corte = diaEnZona(ahora < rango.hasta ? ahora : rango.hasta, zona);
    const vencidos = await conVencidos(ctx, personas, corte);
    return jefes.map((sujetoId): MedicionIndicador => {
      const equipo = [...(equipos.get(sujetoId) ?? [])];
      const alDia = equipo.filter((p) => !vencidos.has(p)).length;
      return { sujetoId, valor: porcentajeDe(alDia, equipo.length) };
    });
  },
});

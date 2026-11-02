import type { Contexto } from "../../types";
import type { ValorIndicador, Indicador } from "@opai/domain";
import { CLAVES_INDICADORES, sinFuenteNoHayInvento } from "@opai/domain";

import { publicacionDesdeFila } from "./comun";

function vigenteEnFecha(vigenteDesde: Date, vigenteHasta: Date | null, f: Date): boolean {
  if (vigenteDesde > f) return false;
  if (vigenteHasta && vigenteHasta < f) return false;
  return true;
}

/** Publicaciones efectivas: plataforma + tenant vigentes para una fecha. */
export async function publicacionesParaFecha(ctx: Contexto, fecha: string): Promise<readonly ValorIndicador[]> {
  const f = new Date(`${fecha}T12:00:00.000Z`);
  const indicadores = await ctx.db.indicadorLegal.findMany();
  const byId = new Map(indicadores.map((i) => [i.id, i]));
  const [publicados, tenantVals] = await Promise.all([
    ctx.db.valorPublicado.findMany({ where: { estado: "vigente" } }),
    ctx.db.valorTenant.findMany({ where: { tenantId: ctx.tenantId, estado: "vigente" } }),
  ]);
  const pubs: ValorIndicador[] = [];
  const tenantPorInd = new Map<string, (typeof tenantVals)[number]>();
  for (const t of tenantVals) {
    if (!vigenteEnFecha(t.vigenteDesde, t.vigenteHasta, f)) continue;
    const prev = tenantPorInd.get(t.indicadorId);
    if (!prev || t.vigenteDesde > prev.vigenteDesde) tenantPorInd.set(t.indicadorId, t);
  }
  for (const t of tenantPorInd.values()) {
    const meta = byId.get(t.indicadorId);
    if (meta) pubs.push(publicacionDesdeFila({ ...t, indicador: meta }));
  }
  for (const ind of indicadores) {
    if (pubs.some((x) => x.indicador === ind.clave)) continue;
    const p = publicados
      .filter(
        (v) =>
          v.indicadorId === ind.id && vigenteEnFecha(v.vigenteDesde, v.vigenteHasta, f),
      )
      .sort((a, b) => b.vigenteDesde.getTime() - a.vigenteDesde.getTime())[0];
    if (!p) continue;
    pubs.push(publicacionDesdeFila({ ...p, indicador: ind }));
  }
  return pubs;
}

export function clavesFaltantes(fecha: string, publicaciones: readonly ValorIndicador[]): Indicador[] {
  return CLAVES_INDICADORES.filter((k) => {
    try {
      sinFuenteNoHayInvento(fecha, publicaciones, k);
      return false;
    } catch {
      return true;
    }
  });
}

export async function mutualAdicionalTenant(ctx: Contexto): Promise<number | null> {
  const p = await ctx.db.remuneracionesPerfil.findUnique({ where: { tenantId: ctx.tenantId } });
  if (!p || p.mutualAdicionalEstado !== "vigente" || p.mutualAdicionalEscalada == null) return null;
  return p.mutualAdicionalEscalada;
}

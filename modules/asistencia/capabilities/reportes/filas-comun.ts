import type { Contexto } from "@opai/capabilities";
import { formatearHora, nombreDiaSemana } from "@opai/domain";

import { rangoDias } from "./esquema";

export type Col = { clave: string; etiqueta: string };
export type Fila = Record<string, string | number | boolean | null>;
export type FiltroFilas = { desde: string; hasta: string; personaId?: string; instalacionId?: string };

export function whereDiasConsulta(filtro: FiltroFilas, alcance: object) {
  return {
    fecha: rangoDias(filtro.desde, filtro.hasta),
    ...(filtro.personaId ? { personaId: filtro.personaId } : {}),
    AND: [alcance, filtro.instalacionId ? { instalacionId: filtro.instalacionId } : {}],
  };
}

export const diaSemana = (f: Date, _zona: string) =>
  nombreDiaSemana(f.toISOString().slice(0, 10)).slice(0, 3);

export const horaZona = (d: Date | null, zona: string) => (d ? formatearHora(d, zona) : "—");

export async function zonaTenant(ctx: Contexto) {
  return (await ctx.db.tenant.findUnique({ where: { id: ctx.tenantId }, select: { timezone: true } }))?.timezone ?? "America/Santiago";
}
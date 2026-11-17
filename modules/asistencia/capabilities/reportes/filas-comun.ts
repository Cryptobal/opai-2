import type { Contexto } from "@opai/capabilities";

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

export const diaSemana = (f: Date, zona: string) =>
  new Intl.DateTimeFormat("es-CL", { weekday: "short", timeZone: zona }).format(f).replace(/\.$/, "");

export const horaZona = (d: Date | null, zona: string) =>
  d
    ? new Intl.DateTimeFormat("es-CL", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hourCycle: "h23",
        timeZone: zona,
      }).format(d)
    : "—";

export async function zonaTenant(ctx: Contexto) {
  return (await ctx.db.tenant.findUnique({ where: { id: ctx.tenantId }, select: { timezone: true } }))?.timezone ?? "America/Santiago";
}
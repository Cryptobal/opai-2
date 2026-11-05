import { VIGENCIAS_JORNADA_SEMANAL, type VigenciaJornada } from "@opai/domain";

import type { Contexto } from "../../types";

/** Zona civil del tenant: decide qué día es «hoy» y a qué instante corresponde cada hora de turno. */
export async function zonaDelTenant(ctx: Contexto): Promise<string> {
  const t = await ctx.db.tenant.findUnique({ where: { id: ctx.tenantId }, select: { timezone: true } });
  return t?.timezone ?? "America/Santiago";
}

export const hoyEn = (zona: string, ahora: Date = new Date()): string =>
  new Intl.DateTimeFormat("en-CA", { timeZone: zona }).format(ahora);

/** ¿La empresa tiene el módulo Pauta activo? Sin él, los turnos salen de la jornada pactada. */
export async function pautaActiva(ctx: Contexto): Promise<boolean> {
  if (ctx.modulosActivos.includes("pauta")) return true;
  const m = await ctx.db.tenantModule.findFirst({
    where: { tenantId: ctx.tenantId, moduloId: "pauta", estado: { in: ["activo", "trial"] } },
    select: { id: true },
  });
  return m !== null;
}

/** Mes en curso más el siguiente: lo que el trabajo diario mantiene materializado. */
export function horizonte(hoy: string): { desde: string; hasta: string } {
  const [y, m] = hoy.split("-").map(Number) as [number, number];
  const finY = m === 12 ? y + 1 : y;
  const finM = m === 12 ? 1 : m + 1;
  const ultimo = new Date(Date.UTC(finY, finM, 0)).getUTCDate();
  const p = (n: number) => String(n).padStart(2, "0");
  return { desde: `${y}-${p(m)}-01`, hasta: `${finY}-${p(finM)}-${p(ultimo)}` };
}

const fecha = (d: Date) => d.toISOString().slice(0, 10);

/**
 * Vigencias de la jornada legal: la tabla de la ley como base y, encima, los valores del indicador
 * «jornada» del motor de sueldos (ADR-056): primero los de plataforma y al final los de la empresa,
 * que mandan donde se solapan.
 */
export async function vigenciasJornada(ctx: Contexto): Promise<VigenciaJornada[]> {
  const ind = await ctx.db.indicadorLegal.findUnique({ where: { clave: "jornada" }, select: { id: true } });
  if (!ind) return [...VIGENCIAS_JORNADA_SEMANAL];
  const [plataforma, tenant] = await Promise.all([
    ctx.db.valorPublicado.findMany({ where: { indicadorId: ind.id, estado: "vigente" }, orderBy: { vigenteDesde: "asc" } }),
    ctx.db.valorTenant.findMany({
      where: { tenantId: ctx.tenantId, indicadorId: ind.id, estado: "vigente" },
      orderBy: { vigenteDesde: "asc" },
    }),
  ]);
  const aVigencia = (f: { valorJson: unknown; vigenteDesde: Date; vigenteHasta: Date | null }): VigenciaJornada[] =>
    typeof f.valorJson === "number" && f.valorJson > 0
      ? [{ desde: fecha(f.vigenteDesde), hasta: f.vigenteHasta ? fecha(f.vigenteHasta) : undefined, horas: f.valorJson }]
      : [];
  return [...VIGENCIAS_JORNADA_SEMANAL, ...plataforma.flatMap(aVigencia), ...tenant.flatMap(aVigencia)];
}

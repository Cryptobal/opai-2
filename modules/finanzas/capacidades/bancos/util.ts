import { noEncontrado } from "@opai/capabilities";
import type { Contexto } from "@opai/capabilities";

export async function cuentaDe(ctx: Contexto, id: string) {
  const c = await ctx.db.cuentaBancaria.findFirst({ where: { id } });
  if (!c) throw noEncontrado("La cuenta bancaria");
  return c;
}

export async function movimientoDe(ctx: Contexto, id: string) {
  const m = await ctx.db.movimientoBancario.findFirst({ where: { id } });
  if (!m) throw noEncontrado("El movimiento bancario");
  return m;
}

export const aIso = (d: Date | string): string =>
  (typeof d === "string" ? d : d.toISOString()).slice(0, 10);
export const aFecha = (iso: string): Date => new Date(`${iso}T00:00:00Z`);

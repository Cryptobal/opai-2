import { createHash } from "node:crypto";

import type { Contexto } from "@opai/capabilities";
import { ajusteFinanzas, hoyChile, pagosImpuestosEsperados } from "@opai/capabilities";
import { lunesDe } from "@opai/domain";

import type { CeldaFlujo } from "../domain";
import type { celdaSchema } from "./esquemas";
import { FILA_DIFERENCIA_FACTORING, FILA_IVA, FILA_PPM } from "./filas-virtuales";
import type { z } from "zod";

type Vista = z.infer<typeof celdaSchema>;

const idEstable = (texto: string): string => {
  const h = createHash("sha1").update(texto).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`;
};

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const mesDe = (periodo: string) => `${MESES[Number(periodo.slice(5, 7)) - 1]} ${periodo.slice(0, 4)}`;

/**
 * IVA a pagar y PPM proyectados (egresos comprometidos): IVA del mes M en M+1, o en M+2 si ese mes está marcado como
 * postergado; PPM siempre en M+1. Solo semanas desde la actual dentro de `semanas`. Solo lectura.
 */
export async function celdasImpuestos(
  ctx: Contexto,
  semanas: readonly string[],
): Promise<{ dominio: CeldaFlujo[]; vista: Vista[] }> {
  const enRango = new Set(semanas);
  const pagos = (await pagosImpuestosEsperados(ctx, hoyChile())).filter((p) => enRango.has(p.semana));
  const dominio: CeldaFlujo[] = [];
  const vista: Vista[] = [];
  for (const p of pagos) {
    const filaId = p.tipo === "iva" ? FILA_IVA : FILA_PPM;
    dominio.push({ filaId, semana: p.semana, capa: "comprometido", monto: p.monto });
    const nota =
      p.tipo === "iva"
        ? `IVA de ${mesDe(p.periodo)} · se paga el ${p.fecha}${p.postergado ? " (postergado a M+2)" : ""}`
        : `PPM de ${mesDe(p.periodo)} · se paga el ${p.fecha}`;
    vista.push({ id: idEstable(`${p.tipo}|${p.periodo}`), filaId, semana: p.semana, capa: "comprometido", monto: p.monto, nota });
  }
  return { dominio, vista };
}

/** Cuenta con la que la empresa rotula la diferencia del factoring (ajuste por empresa). */
export const cuentaDiferenciaFactoring = (ctx: Contexto) => ajusteFinanzas(ctx, "flujo_cuenta_diferencia_factoring");

/**
 * Diferencia del factoring (descuento del factor) por cesión, solo informativa: va a la vista y NO a la suma de la
 * planilla (el depósito del factor ya es el ingreso; sumarla descontaría dos veces el descuento).
 */
export async function celdasDiferenciaFactoring(ctx: Contexto, semanas: readonly string[]): Promise<Vista[]> {
  const enRango = new Set(semanas);
  const cesiones = await ctx.db.cesion.findMany({
    where: { estado: { notIn: ["simulada", "anulada"] }, merma: { gt: 0 } },
    select: { id: true, merma: true, createdAt: true, factorNombre: true, documento: { select: { folio: true } } },
  });
  const cuenta = await cuentaDiferenciaFactoring(ctx);
  return cesiones.flatMap((c) => {
    const semana = lunesDe(new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago" }).format(c.createdAt));
    if (!enRango.has(semana)) return [];
    const folio = c.documento.folio != null ? ` folio ${c.documento.folio}` : "";
    return [{ id: c.id, filaId: FILA_DIFERENCIA_FACTORING, semana, capa: "real" as const, monto: c.merma, nota: `${cuenta} · descuento de ${c.factorNombre ?? "el factor"}${folio} (informativo, no suma al saldo)` }];
  });
}

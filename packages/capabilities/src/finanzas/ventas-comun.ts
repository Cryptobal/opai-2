import { z } from "zod";

import {
  AMBIENTES_SII,
  type AmbienteSii,
  ivaDesdeNeto,
  type MontosDteVenta,
  type TipoDteVenta,
  foliosRestantes,
} from "@opai/domain";
import type { TenantTx } from "@opai/db";

import { uuidSchema } from "../core/esquemas";
import { noEncontrado, reglaDeNegocio } from "../errores";
import type { Contexto } from "../types";

export const PERMISO_VENTAS = "finanzas:ventas.manage";

export const tipoDteVentaSchema = z
  .union([z.literal(33), z.literal(34), z.literal(61)])
  .describe("Tipo de DTE de venta: 33 factura, 34 exenta, 61 nota de crédito.");

export function montosDesdeLineas(tipo: 33 | 34, lineas: readonly { monto: number }[]): MontosDteVenta {
  const bruto = lineas.reduce((a, l) => a + l.monto, 0);
  if (tipo === 33) {
    const neto = bruto;
    const iva = ivaDesdeNeto(neto);
    return { neto, exento: 0, iva, otros: 0, total: neto + iva };
  }
  return { neto: 0, exento: bruto, iva: 0, otros: 0, total: bruto };
}

export function montosNotaCredito(
  ref: { montoNeto: number; montoExento: number; montoTotal: number },
  monto: number,
): MontosDteVenta {
  if (ref.montoExento > 0 || ref.montoNeto === 0) {
    return { neto: 0, exento: monto, iva: 0, otros: 0, total: monto };
  }
  const neto = Math.round((monto * ref.montoNeto) / ref.montoTotal);
  const iva = monto - neto;
  return { neto, exento: 0, iva, otros: 0, total: monto };
}

export async function cuentaDe(ctx: Contexto, id: string) {
  const c = await ctx.db.cuenta.findFirst({ where: { id }, select: { id: true, nombre: true, rut: true } });
  if (!c) throw noEncontrado("La cuenta");
  return c;
}

export async function instalacionDe(ctx: Contexto, id: string, cuentaId: string) {
  const i = await ctx.db.instalacion.findFirst({
    where: { id, cuentaId },
    select: { id: true, nombre: true },
  });
  if (!i) throw noEncontrado("La instalación");
  return i;
}

export async function cotizacionDe(ctx: Contexto, id: string) {
  const c = await ctx.db.cpqCotizacion.findFirst({ where: { id }, select: { id: true } });
  if (!c) throw noEncontrado("La cotización");
  return c;
}

export async function ambienteDe(ctx: Contexto): Promise<AmbienteSii> {
  const cfg = await ctx.db.dteConfig.findUnique({ where: { tenantId: ctx.tenantId } });
  const amb = cfg?.ambiente ?? "certificacion";
  if (!(AMBIENTES_SII as readonly string[]).includes(amb)) return "certificacion";
  return amb as AmbienteSii;
}

export async function rutEmisorDe(ctx: Contexto): Promise<string> {
  const cfg = await ctx.db.dteConfig.findUnique({ where: { tenantId: ctx.tenantId } });
  if (!cfg?.rutEmisor) {
    throw reglaDeNegocio("Configure el RUT emisor en la configuración DTE antes de emitir.");
  }
  return cfg.rutEmisor;
}

type TxLike = Pick<Contexto, "db" | "transaccion" | "tenantId">;

/**
 * Reserva el siguiente folio del rango activo (optimista con updateMany, sin FOR UPDATE).
 * Devuelve el folio asignado o lanza si no quedan folios.
 */
export async function consumirFolio(
  ctx: TxLike,
  tipoDte: TipoDteVenta,
  dryRun: boolean,
): Promise<number> {
  const reservar = async (tx: TenantTx) => {
    const rango = await tx.dteFolio.findFirst({
      where: { tipoDte, activo: true },
      orderBy: [{ folioDesde: "asc" }, { id: "asc" }],
    });
    if (!rango || rango.folioActual > rango.folioHasta) {
      throw reglaDeNegocio(`No hay folios disponibles para el DTE ${tipoDte}. Cargue un CAF.`);
    }
    const folio = rango.folioActual;
    if (dryRun) return folio;
    const { count } = await tx.dteFolio.updateMany({
      where: { id: rango.id, folioActual: folio, activo: true },
      data: { folioActual: folio + 1 },
    });
    if (count !== 1) {
      throw reglaDeNegocio("No se pudo reservar el folio; reintente la emisión.");
    }
    return folio;
  };
  return ctx.transaccion(reservar);
}

export function folioVista(r: {
  id: string;
  tipoDte: number;
  folioDesde: number;
  folioHasta: number;
  folioActual: number;
  cafVenceEn: Date | null;
  umbralAviso: number;
  activo: boolean;
}) {
  const restantes = foliosRestantes(r.folioActual, r.folioHasta);
  return {
    id: r.id,
    tipoDte: r.tipoDte,
    folioDesde: r.folioDesde,
    folioHasta: r.folioHasta,
    folioActual: r.folioActual,
    restantes,
    alerta: restantes > 0 && restantes <= r.umbralAviso,
    cafVenceEn: r.cafVenceEn?.toISOString().slice(0, 10) ?? null,
    activo: r.activo,
  };
}

export const lineaInputSchema = z.object({
  glosa: z.string().trim().min(1).max(300),
  monto: z.number().int().min(1).max(2_000_000_000),
});

export const documentoEmitidoIdSchema = uuidSchema;

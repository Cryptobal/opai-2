import { z } from "zod";

import {
  AMBIENTES_SII,
  type AmbienteSii,
  ivaDesdeNeto,
  type MontosDteVenta,
} from "@opai/domain";

import { uuidSchema } from "../core/esquemas";
import { noEncontrado, reglaDeNegocio } from "../errores";
import type { Contexto } from "../types";

export {
  avisosDteDe,
  consumirFolio,
  folioVista,
  marcarBorradorEmitido,
  type OpcionesFolioVista,
} from "./ventas-folios-logica";

export const PERMISO_VENTAS = "finanzas:ventas.manage";
/** Cargar CAF y configuración DTE sensible (paridad 1.0 `facturacion_configure`). Owner/admin vía `finanzas:*`. */
export const PERMISO_VENTAS_CONFIGURE = "finanzas:ventas.configure";

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
  const c = await ctx.db.cuenta.findFirst({
    where: { id },
    select: {
      id: true,
      nombre: true,
      razonSocial: true,
      rut: true,
      giro: true,
      calle: true,
      comuna: true,
      ciudad: true,
      emailDte: true,
    },
  });
  if (!c) throw noEncontrado("La cuenta");
  return c;
}

/** Datos del receptor DTE desde la cuenta (importación 1.0 / ficha de cliente). */
export function receptorDteDe(cuenta: {
  nombre: string;
  razonSocial: string | null;
  giro: string | null;
  calle: string | null;
  comuna: string | null;
  ciudad: string | null;
  emailDte: string | null;
}) {
  const razon = cuenta.razonSocial?.trim();
  return {
    razonSocialReceptor: (razon && razon.length > 0 ? razon : cuenta.nombre).trim(),
    giroReceptor: cuenta.giro?.trim() || undefined,
    direccionReceptor: cuenta.calle?.trim() || undefined,
    comunaReceptor: cuenta.comuna?.trim() || undefined,
    ciudadReceptor: cuenta.ciudad?.trim() || undefined,
    emailReceptor: cuenta.emailDte?.trim() || undefined,
  };
}

export function camposReceptorDteEnPayload(cuenta: Parameters<typeof receptorDteDe>[0]) {
  const r = receptorDteDe(cuenta);
  return {
    razonSocialReceptor: r.razonSocialReceptor,
    ...(r.giroReceptor ? { giroReceptor: r.giroReceptor } : {}),
    ...(r.direccionReceptor ? { direccionReceptor: r.direccionReceptor } : {}),
    ...(r.comunaReceptor ? { comunaReceptor: r.comunaReceptor } : {}),
    ...(r.ciudadReceptor ? { ciudadReceptor: r.ciudadReceptor } : {}),
    ...(r.emailReceptor ? { emailReceptor: r.emailReceptor } : {}),
  };
}

export async function instalacionDe(ctx: Contexto, id: string, cuentaId: string) {
  const i = await ctx.db.instalacion.findFirst({
    where: { id, cuentaId },
    select: { id: true, nombre: true },
  });
  if (!i) throw noEncontrado("La instalación");
  return i;
}

export async function cotizacionDe(ctx: Contexto, id: string, cuentaId: string) {
  const c = await ctx.db.cpqCotizacion.findFirst({ where: { id }, select: { id: true, negocioId: true } });
  if (!c) throw noEncontrado("La cotización");
  const negocio = await ctx.db.negocio.findFirst({
    where: { id: c.negocioId, cuentaId },
    select: { id: true },
  });
  if (!negocio) throw reglaDeNegocio("La cotización no pertenece a la cuenta indicada.");
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

export const lineaInputSchema = z.object({
  glosa: z.string().trim().min(1).max(300),
  monto: z.number().int().min(1).max(2_000_000_000),
});

export const documentoEmitidoIdSchema = uuidSchema;

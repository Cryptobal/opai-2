import { z } from "zod";

import {
  type AmbienteSii,
  type MontosDteVenta,
} from "@opai/domain";
import { totalesVenta } from "@opai/domain/ventas-lineas";
import { ambienteTributarioEfectivo } from "@opai/integrations";

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
  .union([z.literal(33), z.literal(34), z.literal(56), z.literal(61)])
  .describe("Tipo de DTE de venta: 33 factura, 34 exenta, 56 nota de débito, 61 nota de crédito.");

export function montosDesdeLineas(tipo: 33 | 34, lineas: readonly { monto: number }[]): MontosDteVenta {
  return totalesVenta(tipo, lineas.map((l) => l.monto));
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
  rut?: string | null;
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
  // Candado de ambiente (CAR-191): «produccion» solo rige en app.opai.cl con la variable habilitada.
  return ambienteTributarioEfectivo(cfg?.ambiente);
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
  cantidad: z
    .string()
    .trim()
    .regex(/^\d{1,10}([.,]\d{1,4})?$/, "Cantidad con hasta 4 decimales.")
    .optional()
    .describe("Cantidad decimal como texto («2», «0,5»). Opcional: si falta, el PDF no imprime cantidad."),
  unidad: z.string().trim().min(1).max(20).optional(),
  precioUnitario: z.number().int().min(0).max(2_000_000_000).optional().describe("Precio unitario en pesos, antes del descuento."),
  descuentoPct: z.number().int().min(0).max(10_000).optional().describe("Descuento en centésimas de punto (1550 = 15,50 %)."),
});

export const documentoEmitidoIdSchema = uuidSchema;

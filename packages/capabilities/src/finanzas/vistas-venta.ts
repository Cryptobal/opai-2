import { z } from "zod";

import {
  ESTADOS_COBRO_VENTA,
  ESTADOS_DTE_EMITIDO,
  ESTADOS_CESION,
  NOMBRE_TIPO_DTE_VENTA,
  type TipoDteVenta,
  saldoPendiente,
} from "@opai/domain";

import { dia, hoy } from "../core/maestros/comun";

export const lineaSchema = z.object({
  id: z.string(),
  orden: z.number().int(),
  glosa: z.string(),
  monto: z.number().int(),
  cantidad: z.string().nullish().describe("Cantidad de la línea, si se informó (CAR-248: para editar un borrador)."),
  unidad: z.string().nullish(),
  precioUnitario: z.number().int().nullish(),
  descuentoPct: z.number().int().nullish(),
});

export const ventaSchema = z.object({
  id: z.string(),
  cuentaId: z.string(),
  cuentaNombre: z.string(),
  cuentaRut: z.string().nullable(),
  instalacionId: z.string().nullable(),
  cotizacionId: z.string().nullable(),
  tipoDte: z.number().int(),
  tipoDteNombre: z.string(),
  folio: z.number().int().nullable(),
  fechaEmision: z.string().nullable(),
  fechaVencimiento: z.string().nullable(),
  montoNeto: z.number().int(),
  montoExento: z.number().int(),
  montoIva: z.number().int(),
  montoOtros: z.number().int(),
  montoTotal: z.number().int(),
  estadoDte: z.enum(ESTADOS_DTE_EMITIDO),
  estadoCobro: z.enum(ESTADOS_COBRO_VENTA),
  montoCobrado: z.number().int(),
  montoNotasCredito: z.number().int().describe("Suma de las notas de crédito (61) emitidas contra esta factura."),
  montoPendiente: z.number().int().describe("Monto − notas de crédito parciales − cobrado; nunca negativo. La nota de débito no suma deuda."),
  cesionEstado: z.enum(ESTADOS_CESION).nullable(),
  cesionProveedor: z.string().nullable(),
  cesionFactor: z.string().nullable().describe("A quién se cedió (nombre del factor o su RUT); el proveedor es solo el integrador."),
  glosa: z.string().nullable(),
  trackIdSii: z.string().nullable(),
  documentoReferenciaId: z.string().nullable(),
  lineas: z.array(lineaSchema),
  emisionPrevista: z
    .object({ proveedor: z.enum(["simulado", "simpleapi"]), ambiente: z.enum(["certificacion", "produccion"]) })
    .optional()
    .describe("Solo en la vista previa de emitir: proveedor y ambiente con que se firmaría (CAR-242)."),
});

type FilaVenta = {
  id: string;
  cuentaId: string;
  instalacionId: string | null;
  cotizacionId: string | null;
  tipoDte: number;
  folio: number | null;
  fechaEmision: Date | null;
  fechaVencimiento: Date | null;
  montoNeto: number;
  montoExento: number;
  montoIva: number;
  montoOtros: number;
  montoTotal: number;
  estadoDte: string;
  estadoCobro: string;
  montoCobrado: number;
  montoNotasCredito?: number;
  cesionEstado?: string | null;
  cesionProveedor?: string | null;
  cesionFactor?: string | null;
  glosa: string | null;
  trackIdSii: string | null;
  documentoReferenciaId: string | null;
  lineas?: {
    id: string;
    orden: number;
    glosa: string;
    monto: number;
    cantidad?: { toString(): string } | null;
    unidad?: string | null;
    precioUnitario?: number | null;
    descuentoPct?: number | null;
  }[];
};

export function vistaVenta(
  d: FilaVenta,
  cuenta: { nombre: string; rut: string | null },
  lineas: z.input<typeof lineaSchema>[],
): z.input<typeof ventaSchema> {
  const tipo = d.tipoDte as TipoDteVenta;
  return {
    id: d.id,
    cuentaId: d.cuentaId,
    cuentaNombre: cuenta.nombre,
    cuentaRut: cuenta.rut,
    instalacionId: d.instalacionId,
    cotizacionId: d.cotizacionId,
    tipoDte: d.tipoDte,
    tipoDteNombre: NOMBRE_TIPO_DTE_VENTA[tipo] ?? `DTE ${d.tipoDte}`,
    folio: d.folio,
    fechaEmision: dia(d.fechaEmision),
    fechaVencimiento: dia(d.fechaVencimiento),
    montoNeto: d.montoNeto,
    montoExento: d.montoExento,
    montoIva: d.montoIva,
    montoOtros: d.montoOtros,
    montoTotal: d.montoTotal,
    estadoDte: d.estadoDte as (typeof ESTADOS_DTE_EMITIDO)[number],
    estadoCobro: d.estadoCobro as (typeof ESTADOS_COBRO_VENTA)[number],
    montoCobrado: d.montoCobrado,
    montoNotasCredito: d.montoNotasCredito ?? 0,
    montoPendiente: saldoPendiente(d),
    cesionEstado: (d.cesionEstado as (typeof ESTADOS_CESION)[number] | null) ?? null,
    cesionProveedor: d.cesionProveedor ?? null,
    cesionFactor: d.cesionFactor ?? null,
    glosa: d.glosa,
    trackIdSii: d.trackIdSii,
    documentoReferenciaId: d.documentoReferenciaId,
    lineas,
  };
}

/** Fecha de emisión efectiva para vistas (borrador sin fecha → hoy). */
export const emisionVisible = (d: FilaVenta) => dia(d.fechaEmision) ?? hoy();

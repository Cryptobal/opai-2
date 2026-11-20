import { z } from "zod";

import {
  ESTADOS_PAGO_COMPRA,
  ESTADOS_RECEPCION,
  diasParaReclamo,
  estadoPagoCompra,
  vencimientoPago,
  venceReclamo,
} from "@opai/domain";

import { dia, hoy } from "../core/maestros/comun";

export const sugerenciaSchema = z.object({
  centroCostoId: z.string(),
  origen: z.enum(["proveedor", "ultima_compra"]),
});

export const compraSchema = z.object({
  id: z.string(),
  proveedorId: z.string(),
  proveedorRut: z.string(),
  proveedorNombre: z.string(),
  tipoDte: z.number().int(),
  folio: z.number().int(),
  fechaEmision: z.string(),
  fechaRecepcion: z.string(),
  montoNeto: z.number().int(),
  montoExento: z.number().int(),
  montoIva: z.number().int(),
  montoOtros: z.number().int(),
  montoTotal: z.number().int(),
  estadoRecepcion: z.enum(ESTADOS_RECEPCION),
  /** Último día para aceptar o reclamar y días que quedan (negativo = vencido). */
  venceReclamo: z.string(),
  diasParaReclamo: z.number().int(),
  vencimientoPago: z.string(),
  centroCostoId: z.string().nullable(),
  centroCostoNombre: z.string().nullable(),
  /** Solo si no tiene centro: el que se sugiere (nunca se asigna solo). */
  sugerencia: sugerenciaSchema.nullable(),
  origen: z.string(),
  glosa: z.string().nullable(),
  /** Derivado de lo conciliado con el banco (Brief 23); la nota de crédito queda «no_aplica». */
  estadoPago: z.enum(ESTADOS_PAGO_COMPRA),
  montoPagado: z.number().int().describe("Suma de las conciliaciones bancarias confirmadas y vigentes."),
  saldoPorPagar: z.number().int().describe("Total menos lo pagado; 0 en una nota de crédito."),
  pagoVencido: z.boolean().describe("Queda saldo y ya pasó el vencimiento de pago del proveedor."),
});

type FilaCompra = {
  id: string;
  proveedorId: string;
  tipoDte: number;
  folio: number;
  fechaEmision: Date;
  fechaRecepcion: Date;
  montoNeto: number;
  montoExento: number;
  montoIva: number;
  montoOtros: number;
  montoTotal: number;
  estadoRecepcion: string;
  centroCostoId: string | null;
  origen: string;
  glosa: string | null;
};

export function vistaCompra(
  c: FilaCompra,
  proveedor: { rut: string; razonSocial: string; plazoPagoDias: number },
  centroNombre: string | null,
  sugerencia: z.input<typeof sugerenciaSchema> | null,
  montoPagado = 0,
): z.input<typeof compraSchema> {
  const recepcion = dia(c.fechaRecepcion) ?? hoy();
  const emision = dia(c.fechaEmision) ?? recepcion;
  const saldoPorPagar = c.tipoDte === 61 ? 0 : Math.max(c.montoTotal - montoPagado, 0);
  const vencePago = vencimientoPago(emision, proveedor.plazoPagoDias);
  return {
    id: c.id,
    proveedorId: c.proveedorId,
    proveedorRut: proveedor.rut,
    proveedorNombre: proveedor.razonSocial,
    tipoDte: c.tipoDte,
    folio: c.folio,
    fechaEmision: emision,
    fechaRecepcion: recepcion,
    montoNeto: c.montoNeto,
    montoExento: c.montoExento,
    montoIva: c.montoIva,
    montoOtros: c.montoOtros,
    montoTotal: c.montoTotal,
    estadoRecepcion: c.estadoRecepcion as (typeof ESTADOS_RECEPCION)[number],
    venceReclamo: venceReclamo(recepcion),
    diasParaReclamo: diasParaReclamo(recepcion, hoy()),
    vencimientoPago: vencePago,
    centroCostoId: c.centroCostoId,
    centroCostoNombre: centroNombre,
    sugerencia: c.centroCostoId ? null : sugerencia,
    origen: c.origen,
    glosa: c.glosa,
    estadoPago: estadoPagoCompra(c.tipoDte, c.montoTotal, montoPagado),
    montoPagado,
    saldoPorPagar,
    pagoVencido: saldoPorPagar > 0 && vencePago < hoy(),
  };
}

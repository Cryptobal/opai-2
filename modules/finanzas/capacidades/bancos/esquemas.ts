import { z } from "zod";

import { aNumeroSeguro } from "../esquemas";

export const cuentaSchema = z.object({
  id: z.string(),
  banco: z.string(),
  numeroVisible: z.string(),
  moneda: z.string(),
  flujoFilaId: z.string().nullable(),
  activa: z.boolean(),
  /** Última entrega del banco en línea (Web4Leads) y saldo que informó; null si nunca sincronizó. */
  ultimaSyncEn: z.string().nullable(),
  saldoBanco: z.number().int().nullable(),
});

export const movimientoSchema = z.object({
  id: z.string(),
  cuentaId: z.string(),
  fecha: z.string(),
  monto: z.number().int(),
  glosa: z.string(),
  referencia: z.string().nullable(),
  estado: z.enum(["pendiente", "sugerido", "conciliado", "por_autorizar", "ignorado"]),
  origen: z.string(),
  /** Dónde quedó conciliado (fila del flujo, «Facturas» o «Compras»); null si no está conciliado (CAR-328). */
  clasificacion: z.string().nullable().optional(),
  /** Nombre de la regla que lo concilió sola; null si lo hizo una persona. */
  regla: z.string().nullable().optional(),
});

export const filaPreviewSchema = z.object({
  indice: z.number().int(),
  estado: z.enum(["leida", "duplicada", "rechazada"]),
  motivo: z.string().nullable(),
  fecha: z.string().nullable(),
  monto: z.number().int().nullable(),
  glosa: z.string().nullable(),
});

export function montoDe(v: bigint | number): number {
  return aNumeroSeguro(v);
}

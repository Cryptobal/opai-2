import { z } from "zod";

import type { TenantTx } from "@opai/db";

/**
 * CAR-412: copia exacta de un movimiento bancario descartado, para restaurarlo igual. Montos como texto (BigInt no cabe
 * en JSON) y fechas ISO. Las propuestas de conciliación no se copian: se borran al descartar y se vuelven a sugerir.
 */
export const copiaSchema = z.object({
  id: z.uuid(),
  cartolaId: z.uuid().nullable(),
  fecha: z.string(),
  monto: z.string(),
  glosa: z.string(),
  referencia: z.string().nullable(),
  sucursal: z.string().nullable(),
  saldoDespues: z.string().nullable(),
  claveDedupe: z.string(),
  idExterno: z.string().nullable(),
  estado: z.string(),
  origen: z.string(),
  createdAt: z.string(),
});
export type CopiaMovimiento = z.infer<typeof copiaSchema>;

type Fila = Awaited<ReturnType<TenantTx["movimientoBancario"]["findFirstOrThrow"]>>;

export function copiaDe(m: Fila): CopiaMovimiento {
  return {
    id: m.id,
    cartolaId: m.cartolaId,
    fecha: m.fecha.toISOString(),
    monto: m.monto.toString(),
    glosa: m.glosa,
    referencia: m.referencia,
    sucursal: m.sucursal,
    saldoDespues: m.saldoDespues === null ? null : m.saldoDespues.toString(),
    claveDedupe: m.claveDedupe,
    idExterno: m.idExterno,
    estado: m.estado,
    origen: m.origen,
    createdAt: m.createdAt.toISOString(),
  };
}

/** Fila para volver a insertar. Un «sugerido» vuelve a «pendiente»: su propuesta se borró al descartar. */
export function filaDeCopia(c: CopiaMovimiento, tenantId: string, cuentaId: string) {
  return {
    id: c.id,
    tenantId,
    cuentaId,
    cartolaId: c.cartolaId,
    fecha: new Date(c.fecha),
    monto: BigInt(c.monto),
    glosa: c.glosa,
    referencia: c.referencia,
    sucursal: c.sucursal,
    saldoDespues: c.saldoDespues === null ? null : BigInt(c.saldoDespues),
    claveDedupe: c.claveDedupe,
    idExterno: c.idExterno,
    estado: c.estado === "sugerido" ? "pendiente" : c.estado,
    origen: c.origen,
    createdAt: new Date(c.createdAt),
  };
}

export const copiasDe = (json: unknown): CopiaMovimiento[] => z.array(copiaSchema).parse(json);

import { isDeepStrictEqual } from "node:util";

import type { Prisma } from "../src/generated/prisma/client";
import { COMPRAS_QA as q } from "../../testing/src/compras-qa";
import { datosComprasQa, DEFAULTS_QA as defaults } from "./compras-qa-datos";

/** Compara todos los escalares salvo timestamps automáticos; nunca normaliza ni repara lo existente. */
function iguales(filas: object[], esperadas: object[]): boolean {
  const limpiar = (filas: object[]) =>
    filas
      .map((fila) =>
        Object.fromEntries(
          Object.entries(fila).filter(([k]) => !["createdAt", "updatedAt"].includes(k)),
        ),
      )
      .sort((a, b) => String(a.id).localeCompare(String(b.id)));
  return isDeepStrictEqual(limpiar(filas), limpiar(esperadas));
}

/** Solo permite ausencia total o conjunto exacto. Parciales, colisiones y enlaces extra fallan cerrados. */
export async function fixtureComprasYaExiste(tx: Prisma.TransactionClient, tenantId: string) {
  const d = datosComprasQa(tenantId);
  const filas = await Promise.all([
    tx.proveedor.findMany({
      where: { OR: [{ id: q.proveedor }, { tenantId, rut: d.proveedor.rut }] },
    }),
    tx.cuentaBancaria.findMany({
      where: {
        OR: [
          { id: q.cuenta },
          { tenantId, banco: d.cuenta.banco, numeroVisible: d.cuenta.numeroVisible },
        ],
      },
    }),
    tx.documentoRecibido.findMany({
      where: {
        OR: [
          { id: { in: [q.pendiente, q.pagada] } },
          { proveedorId: q.proveedor },
          { tenantId, folio: { in: [q.folioPendiente, q.folioPagada] } },
        ],
      },
    }),
    tx.movimientoBancario.findMany({
      where: { OR: [{ id: q.movimiento }, { cuentaId: q.cuenta }] },
    }),
    tx.conciliacionBanco.findMany({
      where: {
        OR: [
          { id: q.conciliacion },
          { movimientoId: q.movimiento },
          { enlaceId: { in: [q.pendiente, q.pagada] } },
        ],
      },
    }),
  ]);
  if (filas.every((lista) => lista.length === 0)) return false;
  const esperado = [
    [{ ...defaults.proveedor, ...d.proveedor }],
    [{ ...defaults.cuenta, ...d.cuenta }],
    d.documentos.map((doc) => ({ ...defaults.documento, ...doc })),
    [{ ...defaults.movimiento, ...d.movimiento }],
    [{ ...defaults.conciliacion, ...d.conciliacion }],
  ];
  if (filas.every((lista, i) => iguales(lista, esperado[i]!))) return true;
  throw new Error("Colisión o cambio en fixture de compras: no se modifica ninguna fila.");
}

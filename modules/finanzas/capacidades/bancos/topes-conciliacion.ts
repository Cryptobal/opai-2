import { pendienteFacturaEmitida, reglaDeNegocio } from "@opai/capabilities";
import type { TenantTx } from "@opai/db";

type Tx = Pick<TenantTx, "$executeRaw" | "documentoEmitido" | "documentoRecibido" | "conciliacionBanco" | "importacionFila">;

/** Un mismo documento no puede aparecer dos veces en una conciliación (se suman en un solo enlace). */
export function exigirEnlacesDistintos(enlaces: { tipo: string; id: string }[]): void {
  const vistos = new Set<string>();
  for (const e of enlaces) {
    const clave = `${e.tipo}:${e.id}`;
    if (vistos.has(clave)) throw reglaDeNegocio("Un documento solo puede estar una vez en la conciliación.");
    vistos.add(clave);
  }
}

/**
 * Lo conciliado de un documento nunca supera su pendiente. En ventas el pendiente es monto − notas de crédito
 * parciales (61) − lo ya cobrado (regla de Carlos, 4-nov-2026); la nota de débito (56) no suma deuda.
 * Toma el candado del documento y recién después lo lee, para que dos transacciones simultáneas no vean
 * la misma suma previa y entre las dos superen el total (el candado cae al terminar la transacción).
 */
export async function exigirTopeDocumento(
  tx: Tx,
  tenantId: string,
  tipo: "documento_emitido" | "documento_recibido",
  documentoId: string,
  monto: number,
): Promise<void> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`conciliacion:${tenantId}:${tipo}:${documentoId}`}, 0))`;
  let pendiente: number;
  if (tipo === "documento_emitido") {
    const r = await pendienteFacturaEmitida(tx, documentoId);
    if (!r) throw reglaDeNegocio("El documento emitido no existe.");
    pendiente = r.pendiente;
  } else {
    const doc = await tx.documentoRecibido.findFirst({ where: { id: documentoId }, select: { montoTotal: true } });
    if (!doc) throw reglaDeNegocio("El documento recibido no existe.");
    const previo = await tx.conciliacionBanco.aggregate({
      where: { enlaceId: documentoId, tipoEnlace: tipo, activa: true, confirmada: true },
      _sum: { monto: true },
    });
    pendiente = doc.montoTotal - Number(previo._sum.monto ?? 0n);
  }
  if (monto > pendiente) {
    throw reglaDeNegocio(`El monto supera lo pendiente del documento (${Math.max(pendiente, 0)}).`);
  }
}

import type { TenantTx } from "@opai/db";

/** Estados de cobro del libro de ventas (única función que escribe `estado_cobro`). */
export type EstadoCobro = "pendiente" | "pagada_parcial" | "pagada";

export function calcularEstadoCobro(montoTotal: number, montoCobrado: number): EstadoCobro {
  if (montoCobrado <= 0) return "pendiente";
  if (montoCobrado + 1 >= montoTotal) return "pagada";
  return "pagada_parcial";
}

/** Registra cobro parcial o total sobre un DTE emitido (desde banco o pago manual). */
export async function registrarCobroDocumento(
  tx: TenantTx,
  input: { documentoId: string; monto: number },
): Promise<{ estadoCobro: EstadoCobro; montoCobrado: number }> {
  const doc = await tx.documentoEmitido.findFirst({ where: { id: input.documentoId } });
  if (!doc || doc.estadoDte === "borrador") {
    throw new Error("DOCUMENTO_NO_EMITIDO");
  }
  const previo = doc.montoCobrado;
  const montoCobrado = Math.min(doc.montoTotal, previo + input.monto);
  const estadoCobro = calcularEstadoCobro(doc.montoTotal, montoCobrado);
  await tx.documentoEmitido.update({
    where: { id: doc.id },
    data: { montoCobrado, estadoCobro },
  });
  return { estadoCobro, montoCobrado };
}

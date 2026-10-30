import type { TenantTx } from "@opai/db";

import { generarEtiquetaFirmada } from "./firma";

/**
 * Crea la etiqueta vigente de un punto (firmada, origen `generada`, R7) y devuelve su código. La usa
 * tanto crear un punto como reemplazar su etiqueta; el llamador la corre dentro de la transacción de
 * la escritura (ADR-052) y es quien decide cómo tratar un choque con el índice único parcial de «una
 * vigente por punto» (en reemplazo, un reintento concurrente).
 */
export async function crearEtiquetaVigente(
  tx: TenantTx,
  tenantId: string,
  puntoId: string,
): Promise<string> {
  const { codigo } = generarEtiquetaFirmada();
  await tx.etiquetaQr.create({
    data: { tenantId, puntoId, codigo, firmada: true, origen: "generada", estado: "vigente" },
  });
  return codigo;
}

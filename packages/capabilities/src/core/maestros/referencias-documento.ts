// Referencias para llenar `{{#cada referencias}}` (CAR-138 PR 7). Solo clientes activos con
// consentimiento vigente, dentro del alcance del actor y nunca la cuenta destinataria del documento.
import { valoresReferencia, type ValorCampo } from "@opai/domain";

import type { Contexto } from "../../types";
import { dondeCuenta } from "./alcance";
import { esVigente, hoyReferencias, ultimasReferencias } from "./referencias-vista";

export const MAX_REFERENCIAS = 10;

export async function referenciasParaDocumento(
  ctx: Contexto,
  cuentaDestinoId: string,
): Promise<{ cuentaId: string; valores: Record<string, ValorCampo> }[]> {
  const hoy = hoyReferencias();
  const filas = await ultimasReferencias(ctx, {
    id: { not: cuentaDestinoId },
    estado: "cliente_activo",
    archivadaEn: null,
    AND: [dondeCuenta(ctx)],
  });
  return filas
    .filter((f) => esVigente(f, hoy))
    .map((f) => ({ cuentaId: f.cuentaId, valores: valoresReferencia(f) }))
    .sort((a, b) =>
      String(a.valores["referencia.cliente"]).localeCompare(
        String(b.valores["referencia.cliente"]),
        "es",
      ),
    )
    .slice(0, MAX_REFERENCIAS);
}

import type { Contexto } from "@opai/capabilities";

import type { EstadoCotizacion } from "../domain";
import { esCongelada } from "../domain/estado-ficha";
import type { ResultadoCalculo } from "../domain/motor";
import { calculoCongelado } from "./calculo-congelado";
import { recalcularVersion } from "./recalcular";
import type { VersionCtx } from "./version";

type Fila = { tipo: string; habilitada: boolean; posiciones: number };

/**
 * Cálculo que muestra y valida la ficha (CAR-192). Solo el borrador se recalcula en vivo; desde
 * «en aprobación» se ve lo congelado al pedir aprobar o dejar lista, así una versión aprobada no
 * vuelve a decir «Requiere aprobación».
 */
export async function calculoVigente(
  ctx: Contexto,
  cotizacionId: string,
  version: Pick<VersionCtx, "estado" | "numero" | "ventaMensualClp" | "validaHasta" | "calculoCongeladoJson">,
  lineas: readonly Fila[],
): Promise<ResultadoCalculo | null> {
  if (!esCongelada(version.estado as EstadoCotizacion)) return recalcularVersion(ctx, cotizacionId, version.numero, false);
  // Versiones lista o en aprobación anteriores a CAR-192 no guardaron el cálculo: se calcula en vivo.
  const sinGuardar = !version.calculoCongeladoJson && (version.estado === "lista" || version.estado === "en_aprobacion");
  if (sinGuardar) return recalcularVersion(ctx, cotizacionId, version.numero, false);
  return calculoCongelado(ctx, version, lineas);
}

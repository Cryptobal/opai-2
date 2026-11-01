// Centros de costo (finanzas-compras.md §4). Decisión de Carlos (30-oct-2026): los centros de costo
// son las instalaciones más uno general. Lógica pura.

/** Nombre del centro de costo general, tal como lo decidió Carlos (el export decía «Administración»). */
export const NOMBRE_CENTRO_GENERAL = "Administración / Oficina central";

/** Un centro de costo se identifica por su instalación o por ser el general. */
export type CentroCostoRef = { tipo: "instalacion"; instalacionId: string } | { tipo: "general" };

export type OrigenSugerencia = "proveedor" | "ultima_compra";

export type SugerenciaCentro = { centroCostoId: string; origen: OrigenSugerencia };

/**
 * Sugiere el centro de costo de una compra sin asignar: primero el defecto del proveedor, después el
 * de su última compra con centro. Las reglas de clasificación llegan con la conciliación (PR 2).
 * Nunca asigna: la sugerencia se confirma a mano o en lote.
 */
export function sugerirCentroCosto(entrada: {
  centroProveedor: string | null;
  centroUltimaCompra: string | null;
}): SugerenciaCentro | null {
  if (entrada.centroProveedor) return { centroCostoId: entrada.centroProveedor, origen: "proveedor" };
  if (entrada.centroUltimaCompra)
    return { centroCostoId: entrada.centroUltimaCompra, origen: "ultima_compra" };
  return null;
}

export type FilaAsignacion = { id: string; centroCostoId: string | null };

export type VistaPreviaAsignacion = {
  /** Se les asignará el centro: no tenían ninguno, o tenían otro y se pidió sobrescribir. */
  aplican: string[];
  /** Ya tienen ese mismo centro: sin cambio. */
  sinCambio: string[];
  /** Tienen otro centro y no se pidió sobrescribir: no se tocan. */
  conOtroCentro: string[];
};

/** Vista previa de una asignación en lote (dryRun): qué filas cambiarían y cuáles no. */
export function vistaPreviaAsignacion(
  filas: readonly FilaAsignacion[],
  destinoId: string,
  sobrescribir: boolean,
): VistaPreviaAsignacion {
  const r: VistaPreviaAsignacion = { aplican: [], sinCambio: [], conOtroCentro: [] };
  for (const f of filas) {
    if (f.centroCostoId === destinoId) r.sinCambio.push(f.id);
    else if (f.centroCostoId === null || sobrescribir) r.aplican.push(f.id);
    else r.conOtroCentro.push(f.id);
  }
  return r;
}

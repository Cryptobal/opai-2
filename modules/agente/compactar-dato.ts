/**
 * Quita arrays `lineas` del dato de herramientas (CAR-525): en listados de ventas hinchan el JSON
 * y el tope de 24k del turno cortaba las filas; el detalle de líneas va en finanzas_ventas_obtener.
 */
export function compactarDatoAgente(dato: unknown): unknown {
  if (Array.isArray(dato)) return dato.map(compactarDatoAgente);
  if (dato && typeof dato === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(dato as Record<string, unknown>)) {
      if (k === "lineas" && Array.isArray(v)) continue;
      out[k] = compactarDatoAgente(v);
    }
    return out;
  }
  return dato;
}

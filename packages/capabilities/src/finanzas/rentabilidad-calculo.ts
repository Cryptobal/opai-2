// Rentabilidad por instalación (CAR-174): cálculo puro de ventas netas contra costo laboral estimado.
// Sin base de datos. Las notas de crédito restan (signoDte); el margen % es entero en PCT_ESCALA.
import { PCT_ESCALA, signoDte, type TipoDteCompra } from "@opai/domain";

export type VentaParaRentabilidad = { instalacionId: string | null; tipoDte: number; montoNeto: number; montoExento: number };

/** Costo de un puesto: monto, o el motivo por el que no se calculó. */
export type CostoPuesto = { instalacionId: string; estado: "ok"; costoClp: number } | { instalacionId: string; estado: "sin_costo" | "oculto" };

export type FilaRentabilidad = {
  instalacionId: string | null;
  ventasNetasClp: number;
  documentos: number;
  costoEstimadoClp: number;
  puestos: number;
  puestosSinCosto: number;
  puestosOcultos: number;
  /** Null si hay puestos ocultos: sin sus sueldos el margen sería engañoso. */
  margenClp: number | null;
  /** Margen sobre ventas en PCT_ESCALA (1.000.000 = 100 %); null sin ventas positivas o con puestos ocultos. */
  margenPct: number | null;
};

const vacia = (instalacionId: string | null): FilaRentabilidad => ({
  instalacionId, ventasNetasClp: 0, documentos: 0, costoEstimadoClp: 0, puestos: 0, puestosSinCosto: 0, puestosOcultos: 0, margenClp: 0, margenPct: null,
});

/** Junta ventas y costos por instalación y ordena por margen ascendente (las que pierden plata primero). */
export function rentabilidadPorInstalacion(ventas: readonly VentaParaRentabilidad[], costos: readonly CostoPuesto[]): FilaRentabilidad[] {
  const filas = new Map<string | null, FilaRentabilidad>();
  const fila = (id: string | null) => {
    const f = filas.get(id) ?? vacia(id);
    filas.set(id, f);
    return f;
  };
  for (const v of ventas) {
    const f = fila(v.instalacionId);
    f.ventasNetasClp += signoDte(v.tipoDte as TipoDteCompra) * (v.montoNeto + v.montoExento);
    f.documentos += 1;
  }
  for (const c of costos) {
    const f = fila(c.instalacionId);
    f.puestos += 1;
    if (c.estado === "ok") f.costoEstimadoClp += c.costoClp;
    else if (c.estado === "oculto") f.puestosOcultos += 1;
    else f.puestosSinCosto += 1;
  }
  return [...filas.values()]
    .map((f) => {
      if (f.puestosOcultos > 0) return { ...f, margenClp: null, margenPct: null };
      const margenClp = f.ventasNetasClp - f.costoEstimadoClp;
      const margenPct = f.ventasNetasClp > 0 ? Math.round((margenClp * PCT_ESCALA) / f.ventasNetasClp) : null;
      return { ...f, margenClp, margenPct };
    })
    // Las que pierden plata primero; las de margen desconocido (puestos ocultos) al final.
    .sort((a, b) => (a.margenClp ?? Infinity) - (b.margenClp ?? Infinity) || String(a.instalacionId).localeCompare(String(b.instalacionId)));
}

/** Totales de la empresa en el mes. */
export function totalesRentabilidad(filas: readonly FilaRentabilidad[]) {
  const s = (k: "ventasNetasClp" | "costoEstimadoClp" | "puestosSinCosto" | "puestosOcultos") => filas.reduce((t, f) => t + f[k], 0);
  const ventas = s("ventasNetasClp");
  const costo = s("costoEstimadoClp");
  const completo = s("puestosOcultos") === 0;
  return {
    ventasNetasClp: ventas,
    costoEstimadoClp: costo,
    margenClp: completo ? ventas - costo : null,
    margenPct: completo && ventas > 0 ? Math.round(((ventas - costo) * PCT_ESCALA) / ventas) : null,
    puestosSinCosto: s("puestosSinCosto"),
    puestosOcultos: s("puestosOcultos"),
  };
}

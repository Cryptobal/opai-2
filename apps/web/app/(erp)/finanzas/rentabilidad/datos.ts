import { formatearPorcentaje } from "@opai/domain";

import { CargaFallida, exigirDatos } from "@/lib/carga";
import { ejecutarComoUsuario } from "@/lib/servidor";

export type FilaRentabilidad = {
  instalacionId: string | null;
  nombre: string;
  puestos: number;
  puestosSinCosto: number;
  puestosOcultos: number;
  ventasNetasClp: number;
  costoEstimadoClp: number;
  margenClp: number | null;
  margenPct: number | null;
};
export type Rentabilidad = {
  mes: string;
  corte: string;
  sinValoresLegales: boolean;
  totales: { ventasNetasClp: number; costoEstimadoClp: number; margenClp: number | null; margenPct: number | null; puestosSinCosto: number; puestosOcultos: number };
  instalaciones: FilaRentabilidad[];
};

/** Una consulta por navegación. Sin permiso de Finanzas devuelve null y la pantalla muestra «sin permiso». */
export async function cargarRentabilidad(mes: string): Promise<Rentabilidad | null> {
  try {
    return exigirDatos(await ejecutarComoUsuario<Rentabilidad>("erp", "finanzas.rentabilidad.get", { mes }));
  } catch (e) {
    if (e instanceof CargaFallida && e.code === "FORBIDDEN") return null;
    throw e;
  }
}

/** Margen en millonésimas → «12,5 %». */
export function porcentaje(pct: number | null): string {
  if (pct === null) return "—";
  return formatearPorcentaje(pct);
}

/** Margen en pesos, o «—» si hay puestos ocultos por permiso de sueldos. */
export function margen(clp: number | null, pesos: (n: number) => string): string {
  return clp === null ? "—" : pesos(clp);
}

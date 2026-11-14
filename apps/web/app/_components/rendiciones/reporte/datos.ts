import { CargaFallida, exigirDatos } from "@/lib/carga";
import { ejecutarComoUsuario } from "@/lib/servidor";

import { periodoDeMes, type FiltrosReporte } from "./periodo";

export type GrupoReporte = { clave: string; etiqueta: string; cantidad: number; totalClp: number; aprobadoClp: number; pagadoClp: number };
export type Reporte = { cantidad: number; totalClp: number; aprobadoClp: number; pagadoClp: number; grupos: GrupoReporte[] };

/** Una consulta por navegación (`rendiciones.reporte.get`). Sin «ver todas» devuelve null y la pantalla muestra «sin permiso». */
export async function cargarReporte(f: FiltrosReporte): Promise<Reporte | null> {
  try {
    return exigirDatos(await ejecutarComoUsuario<Reporte>("erp", "rendiciones.reporte.get", { periodo: periodoDeMes(f.mes), agrupar: f.agrupar }));
  } catch (e) {
    if (e instanceof CargaFallida && e.code === "FORBIDDEN") return null;
    throw e;
  }
}

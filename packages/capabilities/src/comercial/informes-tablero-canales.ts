// Solicitudes por canal del tablero de reportes (CAR-298). Puro, sin base de datos.
import { montoMensual, porcentaje } from "./informes-calculo";

type Montos = { valorMensual: number | null; montoEstimadoMensual: number | null };
export type SolicitudFila = { canal: string; negocio: (Montos & { estado: string }) | null };

/** Solicitudes por canal y su conversión a negocio y a negocio ganado (CAR-298). */
export function canalesDe<C extends string>(solicitudes: SolicitudFila[], canales: readonly C[]) {
  return canales.map((canal) => {
    const filas = solicitudes.filter((s) => s.canal === canal);
    const conNegocio = filas.filter((s) => s.negocio);
    const ganadas = conNegocio.filter((s) => s.negocio?.estado === "ganado");
    return {
      canal,
      solicitudes: filas.length,
      negocios: conNegocio.length,
      ganados: ganadas.length,
      montoGanadoMensualClp: ganadas.reduce((s, f) => s + (f.negocio ? montoMensual(f.negocio) : 0), 0),
      conversionPct: porcentaje(conNegocio.length, filas.length),
    };
  });
}

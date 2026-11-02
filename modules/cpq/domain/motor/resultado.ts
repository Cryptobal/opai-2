import type { LineaCalculada, ParametrosCalculo, Traza } from "./tipos";
export type ResultadoCalculo = {
  lineas: LineaCalculada[];
  secciones: { id: string; costoMensual: number; costoUnico: number }[];
  categorias: { id: string; clase: "directo" | "indirecto"; costoMensual: number }[];
  costoBase: number; totalMensual: number;
  directos: number; indirectos: number; costoMensual: number; costoUnico: number;
  ventaMensual: number | null; pagosUnicos: number; margenEfectivoPct: number;
  semaforo: "verde" | "amarillo" | "rojo";
  instrumentos: { financiero: number; garantia: number; administracion: number; responsabilidad: number;
    garantizado: number; baseContrato: number; primaAnual: number; kEscalado: number; grossUp: boolean; incluyeUnicos: boolean };
  dotacion: { posiciones: number; personasEscaladas: number };
  uf: ParametrosCalculo["uf"]; fecha: string; estado: "borrador";
  advertencias: string[]; noEnviable: boolean; requiereAprobacion: boolean; traza: Traza[];
};
/** Proyección por lista permitida: nunca clona/resta campos ni devuelve operandos o semáforo. R59. */
export function resultadoSinCostos(r: ResultadoCalculo) {
  return { ventaMensual: r.ventaMensual, pagosUnicos: r.pagosUnicos, dotacion: { ...r.dotacion },
    uf: r.uf ? { ...r.uf } : null, fecha: r.fecha, estado: r.estado,
    advertencias: r.advertencias.filter((a) => a === "costo laboral pendiente: motor de sueldos" || a === "falta valor UF" || a === "rateo mayor que plazo del contrato"),
    noEnviable: r.noEnviable };
}

import type { ResultadoCalculo } from "../domain/motor";

/** Resumen mínimo persistido en `calculoCongeladoJson` (sin filtrar por permiso al guardar). */
export function resumenCalculoCongeladoParaLista(r: ResultadoCalculo) {
  return {
    ventaMensual: r.ventaMensual,
    semaforo: r.semaforo,
    margenEfectivoPct: r.margenEfectivoPct,
    noEnviable: r.noEnviable,
  };
}

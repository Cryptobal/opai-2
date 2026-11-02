import type { ResultadoCalculo } from "../domain/motor";

/** Resumen mínimo de cuatro campos (legacy C-1); la persistencia guarda el resultado completo. */
export function resumenCalculoCongeladoParaLista(r: ResultadoCalculo) {
  return {
    ventaMensual: r.ventaMensual,
    semaforo: r.semaforo,
    margenEfectivoPct: r.margenEfectivoPct,
    noEnviable: r.noEnviable,
  };
}

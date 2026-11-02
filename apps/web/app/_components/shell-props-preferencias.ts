import type { PreferenciasShell } from "./preferencias-shell";

export function propsPreferenciasShell(preferencias: PreferenciasShell) {
  return {
    fijados: preferencias.fijados,
    errorFijados: preferencias.errorFijados,
    reintentarFijados: preferencias.reintentarFijados,
    onFijar: preferencias.onFijar,
    onDesfijar: preferencias.onDesfijar,
    areaAbierta: preferencias.areaAbierta,
    onAreaAbierta: preferencias.onAreaAbierta,
  };
}

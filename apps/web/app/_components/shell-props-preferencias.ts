import type { PreferenciasShell } from "./preferencias-shell";

/** Props de navegación diferida (fijados y acordeón D1) para `AppShell`. */
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

import type { ItemFijado } from "@opai/ds";

import type { AccionCmdK } from "@/lib/navegacion-entradas";

import type { Accesos } from "./accesos-contexto";
import type { PreferenciasShell } from "./preferencias-shell";

/**
 * Lo que Inicio muestra de «mis accesos» (CAR-182): los mismos fijados y recientes que «Más», tomados
 * de las preferencias que el shell ya cargó (sin consultas nuevas). Fuera del ERP con acceso, nada.
 */
export function accesosDelShell(
  enErp: boolean,
  preferencias: PreferenciasShell | null,
  recientes: () => readonly ItemFijado[],
  acciones: readonly AccionCmdK[] | undefined,
  rutaActual: string,
  onNavegar: (href: string) => void,
): Accesos | null {
  if (!enErp) return null;
  return {
    fijados: preferencias?.fijados,
    error: preferencias?.errorFijados ?? false,
    reintentar: preferencias?.reintentarFijados,
    onFijar: preferencias?.onFijar,
    onDesfijar: preferencias?.onDesfijar,
    recientes,
    acciones: acciones ?? [],
    rutaActual,
    onNavegar,
  };
}

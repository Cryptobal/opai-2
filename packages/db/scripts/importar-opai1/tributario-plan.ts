// Resumen tributario del plan (sin PII): cuentas listas para facturar vs incompletas.
import type { Decision } from "./comun";
import type { DatosCuenta } from "./cuentas";
import { cuentaListaParaFacturar, faltantesTributarios, type CampoTributario } from "./tributario";

export type ResumenTributario = {
  /** Filas de 1.0 que terminarían en crear/actualizar/sin_cambios (canónicas, no duplicadas omitidas). */
  cuentasConsideradas: number;
  listasParaFacturar: number;
  incompletas: number;
  /** Conteo por campo faltante (solo ids en avisos del plan). */
  faltantesPorCampo: Partial<Record<CampoTributario, number>>;
};

const CUENTA_APLICA = new Set(["crear", "actualizar", "sin_cambios"]);

/** Avisos `tributario_incompleto` por fila canónica de cuenta con datos en el plan. */
export function avisosTributariosCuentas(
  decisiones: readonly Decision<DatosCuenta>[],
): { codigo: "tributario_incompleto"; idOpai1: string }[] {
  const avisos: { codigo: "tributario_incompleto"; idOpai1: string }[] = [];
  for (const d of decisiones) {
    if (d.fusionaCon !== null || !d.datos || !CUENTA_APLICA.has(d.accion)) continue;
    if (cuentaListaParaFacturar(d.datos)) continue;
    avisos.push({ codigo: "tributario_incompleto", idOpai1: d.idOpai1 });
  }
  return avisos;
}

function esCanonica(d: Decision<DatosCuenta>): d is Decision<DatosCuenta> & { datos: DatosCuenta } {
  return CUENTA_APLICA.has(d.accion) && d.datos !== null && d.fusionaCon === null;
}

export function resumenTributario(decisiones: readonly Decision<DatosCuenta>[]): ResumenTributario {
  const faltantesPorCampo: Partial<Record<CampoTributario, number>> = {};
  let listasParaFacturar = 0;
  let incompletas = 0;
  let cuentasConsideradas = 0;
  for (const d of decisiones) {
    if (!esCanonica(d)) continue;
    cuentasConsideradas += 1;
    if (cuentaListaParaFacturar(d.datos)) {
      listasParaFacturar += 1;
      continue;
    }
    incompletas += 1;
    for (const c of faltantesTributarios(d.datos)) {
      faltantesPorCampo[c] = (faltantesPorCampo[c] ?? 0) + 1;
    }
  }
  return { cuentasConsideradas, listasParaFacturar, incompletas, faltantesPorCampo };
}

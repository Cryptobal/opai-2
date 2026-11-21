import { COMPLEMENTO_NOMINA_CUMPLIMIENTO_DT } from "@opai/domain";

import { reglaDeNegocio } from "../errores";
import type { Contexto } from "../types";

/** Exige el complemento vendible «Cumplimiento DT» (ADR-057). */
export function exigeComplementoCumplimientoDt(ctx: Contexto) {
  if (!ctx.modulosActivos.includes(COMPLEMENTO_NOMINA_CUMPLIMIENTO_DT)) {
    throw reglaDeNegocio("El complemento Cumplimiento DT no está activo para esta empresa.");
  }
}
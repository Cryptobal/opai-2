import { noRecontratarHabilitada } from "@opai/domain";

import { reglaDeNegocio } from "../../errores";

/**
 * Único lugar que decide si la marca P1 "No recontratar" puede activarse ahora (correcciones del
 * Revisor y del abogado, 30-oct 15:33 CLT): la capacidad de marcar y esta función son el único borde,
 * así que ni la pantalla, ni `/api/v1`, ni el MCP pueden marcar antes del 01-12-2026 en producción. El
 * override de entorno es el único escape, pensado para Vitest y Playwright (que corren contra un
 * build de Next en modo producción, igual que `test.opai.cl`).
 */
export function noRecontratarHabilitadaAhora(): boolean {
  return noRecontratarHabilitada({
    ahora: new Date(),
    produccion: process.env.NODE_ENV === "production",
    forzar: process.env.PERSONAS_NO_RECONTRATAR_FORZAR === "true",
  });
}

export function exigirNoRecontratarHabilitada(): void {
  if (!noRecontratarHabilitadaAhora()) {
    throw reglaDeNegocio(
      "La marca «No recontratar» rige desde el 01-12-2026 (art. 13 d) de la Ley 19.628, modificada por la Ley 21.719): todavía no se puede activar.",
    );
  }
}

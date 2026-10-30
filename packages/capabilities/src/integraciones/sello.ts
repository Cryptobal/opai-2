import { type EvidenciaSello, type PdfSellado, selloDelEntorno } from "@opai/integrations";

import type { Contexto } from "../types";
import { consumoBase } from "./consumo-base";

/**
 * Sellador de firma medido (firma.md R6, P7, ADR-031). Sin prestador contratado todavía usa el
 * adaptador falso de `@opai/integrations`; cada sellado se registra en `core.consumos` como
 * `firma.sello`. Cuando entre el prestador real, la elección por credencial vive en el entorno.
 */
export function selloDe(ctx: Contexto, modulo = "core") {
  const sello = selloDelEntorno();
  return {
    nombre: sello.nombre,
    async sellar(evidencia: EvidenciaSello): Promise<PdfSellado> {
      const r = await sello.sellar(evidencia);
      // El sellado ya ocurrió: se mide siempre (yaIncurrido). El falso no tiene costo real.
      await ctx.medidor
        .registrar({
          ...consumoBase(ctx, modulo),
          recurso: "firma.sello",
          unidad: "documento",
          cantidad: 1,
          sinCosto: r.prestador === "falso",
          yaIncurrido: true,
          referenciaTipo: "solicitud",
          referenciaId: evidencia.solicitudId,
        })
        .catch(() => undefined);
      return r;
    },
  };
}

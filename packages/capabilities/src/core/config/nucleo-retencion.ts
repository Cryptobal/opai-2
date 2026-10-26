import { z } from "zod";

import { reglasDelTrabajo } from "@opai/domain";

import { defineAjustes } from "./registro";

/** Clave del ajuste de días de una regla de retención (`cumplimiento_retencion_<clave>_dias`). */
export const claveAjusteRetencion = (clave: string): string =>
  `cumplimiento_retencion_${clave}_dias`;

const PERMISO = "core:cumplimiento.manage";
// Activar la política o acortar un periodo anonimiza de forma irreversible: solo una persona (ADR-034).

// Un ajuste de días por regla que aplica el trabajo diario (catálogo de @opai/domain), con el
// periodo PROPUESTO por defecto: lo confirma Carlos con el abogado (§16.4). 0 = sin vencimiento.
const dias = Object.fromEntries(
  reglasDelTrabajo().map((r) => [
    claveAjusteRetencion(r.clave),
    z.number().int().min(0).max(36_500).default(r.diasPropuestos).meta({
      etiqueta: `Retención · ${r.clave} (días)`,
      ayuda: `PROPUESTA a confirmar con el abogado. ${r.motivo} 0 = sin vencimiento.`,
      grupo: "Cumplimiento",
      ambito: "tenant",
      permiso: PERMISO,
      soloPersonas: true,
      control: "numero",
    }),
  ]),
);

/**
 * Ajustes de la política de retención (Ley 21.719, Brief 07d §4.5, ADR-038). `activa` parte en
 * `false`: mientras Carlos no confirme los periodos, el trabajo diario solo SIMULA y registra lo que
 * habría hecho; no modifica datos.
 */
export const AJUSTES_RETENCION = defineAjustes(
  "core",
  z.object({
    cumplimiento_retencion_activa: z.boolean().default(false).meta({
      etiqueta: "Aplicar la política de retención",
      ayuda:
        "Apagado: el trabajo diario solo simula y registra lo que anonimizaría o eliminaría, sin tocar datos. Actívalo cuando los periodos estén confirmados con el abogado.",
      grupo: "Cumplimiento",
      ambito: "tenant",
      permiso: PERMISO,
      soloPersonas: true,
      control: "switch",
    }),
    ...dias,
  }),
);

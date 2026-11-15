import { z } from "zod";

import { INDICADORES_INICIO, INDICADORES_INICIO_DEFECTO } from "@opai/domain";

import { defineAjustes } from "./registro";

/**
 * Indicadores de Inicio de la empresa (ADR-109, CAR-335 D3): cuáles se ven y en qué orden, para
 * todos sus usuarios. Sin migración (ADR-038): va en `core.ajuste`. Se cambia con «Personalizar» en
 * Inicio o por `core.config.set`, que exige el permiso de configuración de la empresa.
 */
export const AJUSTES_INICIO = defineAjustes(
  "core",
  z.object({
    inicio_indicadores: z
      .array(z.enum(INDICADORES_INICIO))
      .max(INDICADORES_INICIO.length)
      .refine((ids) => new Set(ids).size === ids.length, "No repitas un indicador")
      .default([...INDICADORES_INICIO_DEFECTO])
      .meta({
        etiqueta: "Indicadores de Inicio",
        ayuda:
          "Qué indicadores ve todo el equipo en Inicio y en qué orden. Vacío: los de por defecto.",
        grupo: "Inicio",
        ambito: "tenant",
        control: "json",
      }),
  }),
);

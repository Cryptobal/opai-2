import { z } from "zod";

import { defineAjustes } from "./registro";

/**
 * Política de llaves nuevas (CAR-350 P-3, referente: llaves restringidas de Stripe). Toda llave nueva
 * vence; la empresa fija la vida máxima. Sin migración (ADR-038): va en `core.ajuste`.
 */
export const AJUSTES_APIKEYS = defineAjustes(
  "core",
  z.object({
    apikeys_vida_maxima_dias: z
      .number()
      .int()
      .min(1)
      .max(365)
      .default(90)
      .meta({
        etiqueta: "Vida máxima de una API key (días)",
        ayuda: "Toda API key nueva vence. Si no se elige fecha, vence a este plazo; nunca más tarde.",
        grupo: "Agentes",
        ambito: "tenant",
      }),
  }),
);

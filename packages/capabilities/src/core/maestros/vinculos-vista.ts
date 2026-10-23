import { z } from "zod";

import { dia, diaSchema } from "./comun";

export const TIPOS_CONTRATO = ["indefinido", "plazo_fijo", "por_obra", "honorarios"] as const;

export const vinculoSchema = z.object({
  id: z.string(),
  personaId: z.string(),
  cargoId: z.string(),
  tipo: z.string(),
  inicio: z.string(),
  termino: z.string().nullable(),
  motivoTermino: z.string().nullable(),
  estado: z.string(),
});

export type FilaVinculo = {
  id: string;
  personaId: string;
  cargoId: string;
  tipo: string;
  inicio: Date;
  termino?: Date | null;
  motivoTermino?: string | null;
  estado?: string | null;
};

export const vistaVinculo = (v: FilaVinculo) => ({
  id: v.id,
  personaId: v.personaId,
  cargoId: v.cargoId,
  tipo: v.tipo,
  inicio: dia(v.inicio) ?? "",
  termino: dia(v.termino),
  motivoTermino: v.motivoTermino ?? null,
  estado: v.estado ?? "vigente",
});

export const camposVinculo = {
  cargoId: z.uuid(),
  tipo: z.enum(TIPOS_CONTRATO),
  inicio: diaSchema.describe("Fecha de inicio del contrato."),
  termino: diaSchema
    .nullable()
    .optional()
    .describe(
      "Término pactado (plazo fijo u obra). El término efectivo va por core.vinculos.terminar.",
    ),
};

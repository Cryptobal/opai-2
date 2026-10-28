import { z } from "zod";

import { dia, diaSchema } from "./comun";

export const TIPOS_CONTRATO = ["indefinido", "plazo_fijo", "por_obra", "honorarios"] as const;

export const vinculoSchema = z.object({
  id: z.string(),
  personaId: z.string(),
  cargoId: z.string(),
  instalacionId: z.string().nullable(),
  puestoId: z.string().nullable(),
  horasSemanales: z.number().nullable(),
  distribucion: z.string().nullable(),
  tipo: z.string(),
  inicio: z.string(),
  termino: z.string().nullable(),
  motivoTermino: z.string().nullable(),
  estado: z.string(),
  updatedAt: z.string().nullable(),
});

export type FilaVinculo = {
  id: string;
  personaId: string;
  cargoId: string;
  instalacionId?: string | null | undefined;
  puestoId?: string | null | undefined;
  horasSemanales?: number | null | undefined;
  distribucion?: string | null | undefined;
  tipo: string;
  inicio: Date;
  termino?: Date | null;
  motivoTermino?: string | null | undefined;
  estado?: string | null | undefined;
  updatedAt?: Date | null;
};

export const vistaVinculo = (v: FilaVinculo) => ({
  id: v.id,
  personaId: v.personaId,
  cargoId: v.cargoId,
  instalacionId: v.instalacionId ?? null,
  puestoId: v.puestoId ?? null,
  horasSemanales: v.horasSemanales ?? null,
  distribucion: v.distribucion ?? null,
  tipo: v.tipo,
  inicio: dia(v.inicio) ?? "",
  termino: dia(v.termino),
  motivoTermino: v.motivoTermino ?? null,
  estado: v.estado ?? "vigente",
  updatedAt: v.updatedAt?.toISOString() ?? null,
});

export const camposVinculo = {
  cargoId: z.uuid(),
  instalacionId: z.uuid().describe("Instalación obligatoria del contrato."),
  puestoId: z.uuid().nullable().optional(),
  horasSemanales: z.number().int().min(1).max(168),
  distribucion: z.string().trim().min(1).max(200),
  tipo: z.enum(TIPOS_CONTRATO),
  inicio: diaSchema.describe("Fecha de inicio del contrato."),
  termino: diaSchema
    .nullable()
    .optional()
    .describe(
      "Término pactado (plazo fijo u obra). El término efectivo va por core.vinculos.terminar.",
    ),
};

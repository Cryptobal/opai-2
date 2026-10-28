import { z } from "zod";

import { iso } from "../comun";

export const MOTIVOS_ANEXO = ["capa", "monto", "instalacion", "rol"] as const;
export const ESTADOS_ANEXO = ["borrador", "aprobado", "rechazado"] as const;

export const anexoSchema = z.object({
  id: z.string(),
  personaId: z.string(),
  vinculoId: z.string(),
  motivoCambio: z.enum(MOTIVOS_ANEXO),
  snapshotAntes: z.unknown().nullable(),
  snapshotDespues: z.unknown(),
  generadoPorTipo: z.enum(["evento", "usuario", "agente"]),
  generadoPorId: z.string().nullable(),
  estado: z.enum(ESTADOS_ANEXO),
  aprobadoPorId: z.string().nullable(),
  aprobadoEn: z.string().nullable(),
  rechazadoPorId: z.string().nullable(),
  rechazadoEn: z.string().nullable(),
  motivoRechazo: z.string().nullable(),
  documentoId: z.string().nullable(),
  creadoEn: z.string(),
});

export type FilaAnexo = {
  id: string;
  personaId: string;
  vinculoId: string;
  motivoCambio: string;
  snapshotAntes: unknown;
  snapshotDespues: unknown;
  generadoPorTipo: string;
  generadoPorId: string | null;
  estado: string;
  aprobadoPorId: string | null;
  aprobadoEn: Date | null;
  rechazadoPorId: string | null;
  rechazadoEn: Date | null;
  motivoRechazo: string | null;
  documentoId: string | null;
  createdAt: Date;
};

export function vistaAnexo(a: FilaAnexo): z.input<typeof anexoSchema> {
  return {
    id: a.id,
    personaId: a.personaId,
    vinculoId: a.vinculoId,
    motivoCambio: a.motivoCambio as z.infer<typeof anexoSchema>["motivoCambio"],
    snapshotAntes: a.snapshotAntes,
    snapshotDespues: a.snapshotDespues,
    generadoPorTipo: a.generadoPorTipo as z.infer<typeof anexoSchema>["generadoPorTipo"],
    generadoPorId: a.generadoPorId,
    estado: a.estado as z.infer<typeof anexoSchema>["estado"],
    aprobadoPorId: a.aprobadoPorId,
    aprobadoEn: iso(a.aprobadoEn),
    rechazadoPorId: a.rechazadoPorId,
    rechazadoEn: iso(a.rechazadoEn),
    motivoRechazo: a.motivoRechazo,
    documentoId: a.documentoId,
    creadoEn: a.createdAt.toISOString(),
  };
}

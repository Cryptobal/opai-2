// Esquemas y utilidades del cierre de mes (BRIEF-33 · CAR-167).
import { z } from "zod";

import { ESTADOS_SEGUIMIENTO_CIERRE, ETAPAS_CIERRE, type SeguimientoCierre } from "@opai/domain";

export const periodoMesSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Usa el formato AAAA-MM.");

export const itemCierreSchema = z.object({
  documentoId: z.string(),
  programacionId: z.string(),
  programacionNombre: z.string(),
  cuentaId: z.string().nullable(),
  cuentaNombre: z.string().nullable(),
  periodo: z.string(),
  tipoDte: z.number().int(),
  folio: z.number().int().nullable(),
  estadoDte: z.string(),
  montoTotal: z.number().int(),
  etapa: z.enum(ETAPAS_CIERRE),
  estado: z.enum(ESTADOS_SEGUIMIENTO_CIERRE),
  requiereOcHes: z.boolean(),
  ordenCompra: z.string().nullable(),
  hes: z.string().nullable(),
  observacion: z.string().nullable(),
  enviadaEn: z.string().nullable(),
  recordadaEn: z.string().nullable(),
  okEn: z.string().nullable(),
  observadaEn: z.string().nullable(),
});
export type ItemCierre = z.infer<typeof itemCierreSchema>;

type FilaSeg = {
  estado: string;
  requiereOcHes: boolean;
  ordenCompra: string | null;
  hes: string | null;
  observacion: string | null;
};

export const aSeguimiento = (s: FilaSeg | null | undefined): SeguimientoCierre | null =>
  s
    ? {
        estado: s.estado as SeguimientoCierre["estado"],
        requiereOcHes: s.requiereOcHes,
        ordenCompra: s.ordenCompra,
        hes: s.hes,
        observacion: s.observacion,
      }
    : null;

export const iso = (d: Date | null | undefined) => (d ? d.toISOString() : null);

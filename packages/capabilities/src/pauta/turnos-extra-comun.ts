import { z } from "zod";

import { ESTADOS_TURNO_EXTRA, TIPOS_TRABAJADOR } from "@opai/domain";

import { instalacionesEnAlcance } from "../core/maestros/alcance";
import type { Contexto } from "../types";
import { fechaIso } from "./comun";

/** Aprobar, rechazar y fijar montos de turnos extra (ADR-083): owner, admin, gerente y roles que lo sumen. */
export const PERMISO_APROBAR_EXTRA = "pauta:aprobar_extra";

/** Turnos extra que el actor ve: los de sus instalaciones si su rol acota por filas (ADR-022). */
export function dondeTurnoExtra(ctx: Contexto): { instalacionId?: { in: string[] } } {
  const ids = instalacionesEnAlcance(ctx);
  return ids ? { instalacionId: { in: [...ids] } } : {};
}

export const turnoExtraSchema = z.object({
  id: z.string(),
  excepcionId: z.string(),
  instalacionId: z.string(),
  puestoId: z.string(),
  personaId: z.string(),
  fecha: z.string(),
  tipoTrabajador: z.enum(TIPOS_TRABAJADOR),
  montoSugeridoClp: z.number().int().describe("Monto de la instalación o del puesto al registrar (CLP)."),
  montoClp: z.number().int().describe("Monto final en CLP; igual al sugerido salvo que quien aprueba lo cambie."),
  montoMotivo: z.string().nullable(),
  estado: z.enum(ESTADOS_TURNO_EXTRA),
  registradoPor: z.string(),
  resueltoPor: z.string().nullable(),
  resueltoEn: z.date().nullable(),
  motivoResolucion: z.string().nullable(),
  createdAt: z.date(),
});
export type VistaTurnoExtra = z.infer<typeof turnoExtraSchema>;

type Fila = {
  id: string;
  excepcionId: string;
  instalacionId: string;
  puestoId: string;
  personaId: string;
  fecha: Date;
  tipoTrabajador: string;
  montoSugeridoClp: number;
  montoClp: number;
  montoMotivo: string | null;
  estado: string;
  registradoPor: string;
  resueltoPor: string | null;
  resueltoEn: Date | null;
  motivoResolucion: string | null;
  createdAt: Date;
};

export function vistaTurnoExtra(f: Fila): VistaTurnoExtra {
  return {
    ...f,
    fecha: fechaIso(f.fecha),
    tipoTrabajador: f.tipoTrabajador as VistaTurnoExtra["tipoTrabajador"],
    estado: f.estado as VistaTurnoExtra["estado"],
  };
}

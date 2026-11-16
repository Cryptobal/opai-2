import { z } from "zod";

import { TIPOS_MOVIMIENTO_MI_DT } from "@opai/domain";

import type { MovimientoMiDt } from "./movimientos";

export const movimientoSchema = z.object({
  clave: z.string(),
  movimientoTipo: z.enum(TIPOS_MOVIMIENTO_MI_DT),
  referenciaId: z.string(),
  personaId: z.string(),
  personaNombre: z.string(),
  rut: z.string(),
  hechoEn: z.string(),
  hechoTexto: z.string(),
  plazoLimite: z.string(),
  plazoEtiqueta: z.string(),
  plazoTono: z.enum(["success", "warning", "danger", "neutral"]),
  registrado: z.boolean(),
  registradoEn: z.string().nullable(),
  comprobanteDocumentoId: z.string().nullable(),
});

export const vistaMovimiento = (m: MovimientoMiDt) => ({
  clave: m.clave,
  movimientoTipo: m.movimientoTipo,
  referenciaId: m.referenciaId,
  personaId: m.personaId,
  personaNombre: m.personaNombre,
  rut: m.rut,
  hechoEn: m.hechoEn,
  hechoTexto: m.hechoTexto,
  plazoLimite: m.plazoLimite,
  plazoEtiqueta: m.plazoEtiqueta,
  plazoTono: m.plazoTono,
  registrado: m.registrado,
  registradoEn: m.registradoEn,
  comprobanteDocumentoId: m.comprobanteDocumentoId,
});
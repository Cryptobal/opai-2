import { z } from "zod";

import { UNIDAD_NOVEDAD, periodoAdmiteNovedades, etiquetaPeriodo, type EstadoPeriodo } from "@opai/domain";

import { aFecha, diaSchema } from "../core/maestros/comun";
import { noEncontrado, reglaDeNegocio } from "../errores";
import type { Contexto } from "../types";
import { documentoExiste, tipoNovedadSchema } from "./comun";
import { dia } from "./comun";

/** Una novedad manual o de carga masiva. `prestamo` solo nace de las cuotas de un préstamo (B3). */
export const novedadEntradaSchema = z.object({
  personaId: z.uuid(),
  tipo: tipoNovedadSchema.exclude(["prestamo"]),
  fechaDesde: diaSchema,
  fechaHasta: diaSchema.optional(),
  cantidad: z.number().positive().max(9999).multipleOf(0.01).optional().describe("Días u horas, según el tipo."),
  montoClp: z.number().int().positive().max(999_999_999).optional().describe("Pesos enteros (anticipo, descuento)."),
  conceptoId: z.uuid().optional().describe("Concepto de descuento del catálogo de la empresa."),
  documentoId: z.uuid().optional().describe("Documento de respaldo (licencia, autorización)."),
  nota: z.string().trim().max(300).optional().describe("Sin datos médicos ni diagnósticos."),
});
export type NovedadEntrada = z.output<typeof novedadEntradaSchema>;

type Periodo = { id: string; anio: number; mes: number; estado: string; inicio: Date; fin: Date };

/** El período admite novedades (no está cerrado ni pagado). */
export function exigirPeriodoAbierto(p: Periodo): void {
  if (!periodoAdmiteNovedades(p.estado as EstadoPeriodo))
    throw reglaDeNegocio(`${etiquetaPeriodo(p.anio, p.mes)} está ${p.estado}; reábrelo para cargar novedades.`);
}

/** Valida una novedad contra su período y devuelve los datos listos para insertar. */
export async function datosNovedad(
  ctx: Contexto,
  p: Periodo,
  e: NovedadEntrada,
  origen: "manual" | "carga_masiva",
  personasValidas?: ReadonlySet<string>,
) {
  const unidad = UNIDAD_NOVEDAD[e.tipo];
  if (unidad === "clp" && (e.montoClp == null || e.cantidad != null))
    throw reglaDeNegocio(`Un ${e.tipo} se registra con un monto en pesos, sin cantidad.`);
  if (unidad !== "clp" && (e.cantidad == null || e.montoClp != null))
    throw reglaDeNegocio(`${e.tipo === "horas_extra" ? "Las horas extra se registran en horas" : "Una " + e.tipo + " se registra en días"}, sin monto.`);
  const hasta = e.fechaHasta ?? e.fechaDesde;
  if (hasta < e.fechaDesde) throw reglaDeNegocio("La fecha de término no puede ser anterior al inicio.");
  if (e.fechaDesde > (dia(p.fin) ?? "") || hasta < (dia(p.inicio) ?? ""))
    throw reglaDeNegocio(`Las fechas no caen en ${etiquetaPeriodo(p.anio, p.mes)}.`);
  if (personasValidas ? !personasValidas.has(e.personaId) : !(await ctx.db.persona.findUnique({ where: { id: e.personaId } })))
    throw noEncontrado("La persona");
  if (e.documentoId) await documentoExiste(ctx, e.documentoId);
  if (e.conceptoId) {
    const c = await ctx.db.nominaConcepto.findUnique({ where: { id: e.conceptoId } });
    if (!c || !c.activo) throw noEncontrado("El concepto");
    if (c.tipo !== "descuento" || e.tipo !== "descuento")
      throw reglaDeNegocio("El concepto aplica solo a un descuento de tipo descuento.");
  }
  return {
    tenantId: ctx.tenantId,
    periodoId: p.id,
    personaId: e.personaId,
    tipo: e.tipo,
    origen,
    estado: "vigente",
    fechaDesde: aFecha(e.fechaDesde),
    fechaHasta: e.fechaHasta ? aFecha(e.fechaHasta) : null,
    cantidad: e.cantidad ?? null,
    montoClp: e.montoClp ?? null,
    conceptoId: e.conceptoId ?? null,
    documentoId: e.documentoId ?? null,
    nota: e.nota ?? null,
  };
}

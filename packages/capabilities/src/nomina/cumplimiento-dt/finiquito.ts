import { z } from "zod";

import { propuestaFiniquito } from "@opai/domain";

import { defineCapability } from "../../define";
import { uuidSchema } from "../../core/esquemas";
import { aFecha, dia, hoy } from "../../core/maestros/comun";
import { noEncontrado, reglaDeNegocio } from "../../errores";
import { PERMISO_READ } from "../comun";
import type { Contexto } from "../../types";
import { exigeComplementoCumplimientoDt } from "./comun";
import { diasDelVinculo, inicioMes, finMes } from "../costo-proyectado-datos";

const lineaSchema = z.object({
  id: z.string(),
  concepto: z.string(),
  origen: z.string(),
  monto: z.number().int(),
});

const salidaSchema = z.object({
  personaId: z.string(),
  personaNombre: z.string(),
  rut: z.string(),
  cargo: z.string(),
  instalacion: z.string().nullable(),
  hechoTexto: z.string(),
  registradoMiDt: z.boolean(),
  propuesta: z.object({
    vinculoId: z.string(),
    terminoEn: z.string(),
    sueldoReferencia: z.number().int(),
    aniosServicio: z.number().int(),
    plazoPagoHasta: z.string(),
    diasHabilesRestantesPago: z.number().int().nullable(),
    lineas: z.array(lineaSchema),
    total: z.number().int(),
    avisos: z.array(z.string()),
  }),
});

import type { Contexto } from "../../types";

async function sueldoAlTermino(ctx: Contexto, personaId: string, puestoId: string | null, instalacionId: string | null, termino: string) {
  const t = aFecha(termino);
  const filas = await ctx.db.estructuraSueldo.findMany({
    where: {
      tenantId: ctx.tenantId,
      estado: "vigente",
      vigenteDesde: { lte: t },
      OR: [{ vigenteHasta: null }, { vigenteHasta: { gte: t } }],
      AND: [
        {
          OR: [
            { nivel: "persona", personaId },
            ...(puestoId ? [{ nivel: "puesto" as const, puestoId }] : []),
            ...(instalacionId ? [{ nivel: "instalacion" as const, instalacionId }] : []),
          ],
        },
      ],
    },
    orderBy: { vigenteDesde: "desc" },
    take: 1,
  });
  return filas[0]?.sueldoBase ?? null;
}

/** Propuesta de finiquito para un vínculo terminado (diseño 08). */
export const cumplimientoDtFiniquitoObtener = defineCapability({
  id: "nomina.finiquito.obtener",
  descripcion:
    "Calcula la propuesta de finiquito de un vínculo terminado: indemnizaciones orientativas, días trabajados del mes de término y plazo de pago. No reemplaza asesoría legal ni la firma en Mi DT.",
  permiso: PERMISO_READ,
  input: z.object({ vinculoId: uuidSchema }),
  output: salidaSchema,
  efecto: "lectura",
  dryRun: false,
  auditarLectura: (s) => [s.personaId],
  async handler(ctx, { vinculoId }) {
    exigeComplementoCumplimientoDt(ctx);
    const v = await ctx.db.vinculoLaboral.findFirst({
      where: { id: vinculoId, tenantId: ctx.tenantId },
      include: {
        persona: { select: { id: true, rut: true, nombres: true, apellidos: true } },
        cargo: { select: { nombre: true } },
        instalacion: { select: { nombre: true } },
      },
    });
    if (!v) throw noEncontrado("El vínculo");
    if (v.estado !== "terminado" || !v.termino) throw reglaDeNegocio("Solo hay finiquito para vínculos terminados.");
    const termino = dia(v.termino)!;
    const inicio = dia(v.inicio)!;
    const sueldoBase = await sueldoAlTermino(ctx, v.personaId, v.puestoId, v.instalacionId, termino);
    const mes = { anio: +termino.slice(0, 4), mes: +termino.slice(5, 7) };
    const diasTrabajadosMes = diasDelVinculo(inicioMes(mes), finMes(mes), inicio, termino);
    const reg = await ctx.db.nominaRegistroMiDt.findFirst({
      where: { tenantId: ctx.tenantId, movimientoTipo: "finiquito", referenciaId: vinculoId },
    });
    const propuesta = propuestaFiniquito(
      {
        vinculoId,
        personaId: v.personaId,
        inicio,
        termino,
        motivoTermino: v.motivoTermino,
        sueldoBase,
        diasTrabajadosMes,
      },
      hoy(),
    );
    const personaNombre = `${v.persona.apellidos} ${v.persona.nombres}`.trim();
    return {
      personaId: v.personaId,
      personaNombre,
      rut: v.persona.rut,
      cargo: v.cargo?.nombre ?? "Sin cargo",
      instalacion: v.instalacion?.nombre ?? null,
      hechoTexto: `Término el ${termino}${v.motivoTermino ? ` · ${v.motivoTermino}` : ""}`,
      registradoMiDt: !!reg,
      propuesta,
    };
  },
});
// Detalle editable de una programación: datos crudos para el formulario e historial de corridas
// (BRIEF-26 · CAR-159).
import { z } from "zod";

import { dia } from "../core/maestros/comun";
import type { Contexto } from "../types";
import { trazaSchema, trazasDe } from "./ventas-programacion-trazabilidad";
import { programacionSchema } from "./ventas-programacion-vistas";

export const detalleProgramacionSchema = programacionSchema.extend({
  diaSemana: z.number().int().nullable(),
  mesDelAnio: z.number().int().nullable(),
  politicaUf: z.string().nullable(),
  diaUf: z.number().int().nullable(),
  fechaInicio: z.string().nullable(),
  fechaFin: z.string().nullable(),
  notas: z.string().nullable(),
  diasFacturacion: z.number().int().nullable(),
  momentoFactura: z.string(),
  diaFactura: z.number().int().nullable(),
  mesRelativoFactura: z.string(),
  autoEnvioProforma: z.boolean(),
  autoEnvioEstadoPago: z.boolean(),
  previoCuando: z.string(),
  previoDia: z.number().int().nullable(),
  esperarOk: z.boolean(),
  exigeOc: z.boolean(),
  ultimoPeriodo10: z.string().nullable(),
  lineasEditables: z.array(
    z.object({
      glosa: z.string(),
      cantidad: z.string(),
      precioUnitario: z.number().int(),
      descuentoPct: z.number().int(),
      exento: z.boolean(),
    }),
  ),
  corridas: z.array(
    z.object({
      periodo: z.string(),
      fechaGeneracion: z.string().nullable(),
      documentoId: z.string().nullable(),
      montoTotal: z.number().int().nullable(),
      traza: trazaSchema.nullable(),
    }),
  ),
});

type Fila = {
  id: string;
  diaSemana: number | null;
  mesDelAnio: number | null;
  politicaUf: string | null;
  diaUf: number | null;
  fechaInicio: Date | null;
  fechaFin: Date | null;
  notas: string | null;
  diasFacturacion: number | null;
  facturaTiming: string;
  facturaDia: number | null;
  facturaMesRelativo: string;
  autoEnvioProforma: boolean;
  autoEnvioEstadoPago: boolean;
  previoCuando: string;
  previoDia: number | null;
  esperarOk: boolean;
  exigeOc: boolean;
  ultimoPeriodo10: string | null;
  lineas: {
    glosa: string;
    cantidad: { toString(): string };
    precioUnitarioClp: bigint | null;
    precioUnitarioUf: bigint | null;
    descuentoPct: number;
    exento: boolean;
  }[];
};

export async function extrasDetalle(ctx: Contexto, f: Fila) {
  const corridas = await ctx.db.ventasProgramacionCorrida.findMany({
    where: { programacionId: f.id },
    orderBy: { periodo: "desc" },
    take: 24,
    select: { periodo: true, fechaGeneracion: true, documentoId: true, montoTotal: true },
  });
  const trazas = await trazasDe(
    ctx,
    corridas.map((c) => c.documentoId).filter((x): x is string => x !== null),
  );
  return {
    diaSemana: f.diaSemana,
    mesDelAnio: f.mesDelAnio,
    politicaUf: f.politicaUf,
    diaUf: f.diaUf,
    fechaInicio: dia(f.fechaInicio),
    fechaFin: dia(f.fechaFin),
    notas: f.notas,
    diasFacturacion: f.diasFacturacion,
    momentoFactura: f.facturaTiming,
    diaFactura: f.facturaDia,
    mesRelativoFactura: f.facturaMesRelativo,
    autoEnvioProforma: f.autoEnvioProforma,
    autoEnvioEstadoPago: f.autoEnvioEstadoPago,
    previoCuando: f.previoCuando,
    previoDia: f.previoDia,
    esperarOk: f.esperarOk,
    exigeOc: f.exigeOc,
    ultimoPeriodo10: f.ultimoPeriodo10,
    lineasEditables: f.lineas.map((l) => ({
      glosa: l.glosa,
      cantidad: l.cantidad.toString(),
      precioUnitario: Number(l.precioUnitarioClp ?? l.precioUnitarioUf ?? 0n),
      descuentoPct: l.descuentoPct,
      exento: l.exento,
    })),
    corridas: corridas.map((c) => ({
      periodo: c.periodo,
      fechaGeneracion: dia(c.fechaGeneracion),
      documentoId: c.documentoId,
      montoTotal: c.montoTotal === null ? null : Number(c.montoTotal),
      traza: c.documentoId ? (trazas.get(c.documentoId) ?? null) : null,
    })),
  };
}

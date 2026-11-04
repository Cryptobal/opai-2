// Detalle editable de una programación: datos crudos para el formulario e historial de corridas
// (BRIEF-26 · CAR-159).
import { z } from "zod";

import { dia } from "../core/maestros/comun";
import type { Contexto } from "../types";
import { programacionSchema } from "./ventas-programacion-vistas";

export const detalleProgramacionSchema = programacionSchema.extend({
  diaSemana: z.number().int().nullable(),
  mesDelAnio: z.number().int().nullable(),
  politicaUf: z.string().nullable(),
  diaUf: z.number().int().nullable(),
  fechaInicio: z.string().nullable(),
  fechaFin: z.string().nullable(),
  notas: z.string().nullable(),
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
  return {
    diaSemana: f.diaSemana,
    mesDelAnio: f.mesDelAnio,
    politicaUf: f.politicaUf,
    diaUf: f.diaUf,
    fechaInicio: dia(f.fechaInicio),
    fechaFin: dia(f.fechaFin),
    notas: f.notas,
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
    })),
  };
}

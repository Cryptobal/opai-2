import { z } from "zod";

import { defineCapability, noEncontrado, type Contexto } from "@opai/capabilities";

import { TIPOS_JORNADA } from "../domain";
import { consolidarYGuardar } from "./dias-calculo";
import { fecha, PORTALES } from "./dias-capacidades";
import { uuid } from "./esquemas";
import { tenantBasico } from "./formato";


export const diasRecalcular = defineCapability({
  id: "asistencia.dias.recalcular",
  descripcion:
    "Recalcula el día consolidado de asistencia de una persona en un rango de fechas a partir de las marcas efectivas (con las correcciones aceptadas o vencidas). Es idempotente: recalcular dos veces da lo mismo.",
  permiso: "asistencia:configurar",
  portales: PORTALES,
  input: z.object({ personaId: uuid, desde: fecha, hasta: fecha })
    .refine((i) => i.hasta >= i.desde && Date.parse(i.hasta) - Date.parse(i.desde) <= 31 * 86_400_000, "El rango es de 31 días como máximo."),
  output: z.object({ dias: z.number().int() }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, i, { dryRun }) {
    if (!(await ctx.db.persona.findUnique({ where: { id: i.personaId }, select: { id: true } }))) throw noEncontrado("La persona");
    const { zona } = await tenantBasico(ctx);
    const fechas: string[] = [];
    for (let t = Date.parse(i.desde); t <= Date.parse(i.hasta); t += 86_400_000) fechas.push(new Date(t).toISOString().slice(0, 10));
    if (dryRun) return { dias: fechas.length };
    for (const f of fechas) await consolidarYGuardar(ctx, i.personaId, f, new Date(), zona);
    return { dias: fechas.length };
  },
});

export const jornadasFijarTipo = defineCapability({
  id: "asistencia.jornadas.fijar_tipo",
  descripcion:
    "Fija el tipo de jornada del vínculo laboral vigente de una persona (ordinaria, excepcional, parcial o teletrabajo). El tipo define sus descansos: el teletrabajo exige 12 horas de desconexión entre jornadas.",
  permiso: "asistencia:configurar",
  portales: PORTALES,
  input: z.object({ personaId: uuid, tipoJornada: z.enum(TIPOS_JORNADA) }),
  output: z.object({ tipoJornada: z.enum(TIPOS_JORNADA) }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx: Contexto, i, { dryRun }) {
    const v = await ctx.db.vinculoLaboral.findFirst({ where: { personaId: i.personaId, estado: "vigente" }, select: { id: true } });
    if (!v) throw noEncontrado("El vínculo laboral vigente");
    if (!dryRun) await ctx.db.vinculoLaboral.update({ where: { id: v.id }, data: { tipoJornada: i.tipoJornada } });
    return { tipoJornada: i.tipoJornada };
  },
});

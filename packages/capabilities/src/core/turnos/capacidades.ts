import { z } from "zod";

import { PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../../define";
import { noEncontrado } from "../../errores";
import { dondePuesto } from "../maestros/alcance";
import { uuidSchema } from "../esquemas";
import { fechaCivilSchema } from "../calendario/comun";
import { horizonte, hoyEn, pautaActiva, zonaDelTenant } from "./comun";
import { regenerarJornada } from "./regenerar-jornada";
import { regenerarPuestos } from "./regenerar-pauta";
import { dias, turnosEsperadosListar } from "./listar";

export { turnosEsperadosListar };

const resumenSchema = z.object({
  modo: z.enum(["pauta", "jornada_pactada"]),
  creados: z.number().int(),
  reemplazados: z.number().int(),
  anulados: z.number().int(),
  sinCambio: z.number().int(),
  omitidos: z.number().int(),
  avisos: z.number().int(),
});

export const turnosEsperadosRegenerar = defineCapability({
  id: "core.turnos_esperados.regenerar",
  descripcion:
    "Recalcula los turnos esperados de un puesto (o de toda la empresa) en un rango de fechas desde la Pauta, o desde la jornada pactada si la empresa no usa Pauta. Solo cambia lo que difiere; repetirla da el mismo resultado. Con vista previa informa cuántos turnos cambiarían.",
  permiso: PERMISOS_CORE.personasLaboralManage,
  input: z
    .object({
      puestoId: uuidSchema.optional(),
      desde: fechaCivilSchema.optional(),
      hasta: fechaCivilSchema.optional(),
    })
    .refine(
      (i) => (i.desde === undefined) === (i.hasta === undefined),
      "Indica «desde» y «hasta» juntos o ninguno.",
    )
    .refine(
      (i) => !i.desde || !i.hasta || i.hasta >= i.desde,
      "«hasta» no puede ser anterior a «desde».",
    )
    .refine(
      (i) => !i.desde || !i.hasta || dias(i.desde, i.hasta) <= 124,
      "Como máximo 124 días por vez.",
    ),
  output: resumenSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, modo) {
    const dryRun = modo.dryRun;
    const zona = await zonaDelTenant(ctx);
    const base = horizonte(hoyEn(zona));
    const desde = input.desde ?? base.desde;
    const hasta = input.hasta ?? base.hasta;
    if (await pautaActiva(ctx)) {
      // Con alcance (ADR-022) solo se regeneran puestos de las instalaciones a cargo; uno fuera de
      // alcance responde como si no existiera.
      const dentro = { AND: [dondePuesto(ctx)] };
      let ids: string[];
      if (input.puestoId) {
        const p = await ctx.db.puesto.findFirst({
          where: { id: input.puestoId, ...dentro },
          select: { id: true },
        });
        if (!p) throw noEncontrado("El puesto");
        ids = [p.id];
      } else {
        const series = await ctx.db.seriePauta.findMany({
          where: {
            vigenteDesde: { lte: new Date(`${hasta}T00:00:00.000Z`) },
            OR: [
              { vigenteHasta: null },
              { vigenteHasta: { gte: new Date(`${desde}T00:00:00.000Z`) } },
            ],
          },
          select: { puestoId: true },
          distinct: ["puestoId"],
        });
        const visibles = await ctx.db.puesto.findMany({
          where: { id: { in: series.map((s) => s.puestoId) }, ...dentro },
          select: { id: true },
        });
        ids = visibles.map((p) => p.id);
      }
      const r = await regenerarPuestos(ctx, ids, desde, hasta, dryRun);
      return { modo: "pauta" as const, ...r, avisos: 0 };
    }
    const j = await regenerarJornada(ctx, desde, hasta, undefined, dryRun);
    return { modo: "jornada_pactada" as const, ...j, avisos: j.avisos.length };
  },
});

export const capacidadesTurnos = [turnosEsperadosListar, turnosEsperadosRegenerar];

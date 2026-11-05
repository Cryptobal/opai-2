import { z } from "zod";

import { horasDeTurnoEsperado, PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../../define";
import { noEncontrado } from "../../errores";
import { dondePuesto } from "../maestros/alcance";
import { uuidSchema } from "../esquemas";
import { fechaCivilSchema, dondeInstalacionId } from "../calendario/comun";
import { horizonte, hoyEn, pautaActiva, zonaDelTenant } from "./comun";
import { regenerarJornada } from "./regenerar-jornada";
import { regenerarPuestos } from "./regenerar-pauta";

const MAX_DIAS = 62;
const dias = (d: string, h: string) => Math.round((Date.parse(h) - Date.parse(d)) / 86_400_000) + 1;

const rangoSchema = z
  .object({ desde: fechaCivilSchema, hasta: fechaCivilSchema })
  .refine((r) => r.hasta >= r.desde, "«hasta» no puede ser anterior a «desde».")
  .refine((r) => dias(r.desde, r.hasta) <= MAX_DIAS, `Como máximo ${MAX_DIAS} días por consulta.`);

const turnoSchema = z.object({
  id: z.string(),
  personaId: z.string(),
  fecha: z.string(),
  inicio: z.string(),
  fin: z.string(),
  instalacionId: z.string(),
  puestoId: z.string().nullable(),
  origen: z.enum(["pauta", "jornada_pactada", "manual"]),
  referencia: z.string().nullable(),
  colacionMin: z.number().int(),
  feriado: z.boolean(),
  horasEsperadas: z.number(),
  version: z.number().int(),
  vigente: z.boolean(),
});

const LIMITE = 2000;

export const turnosEsperadosListar = defineCapability({
  id: "core.turnos_esperados.listar",
  descripcion:
    "Lista los turnos esperados (qué turno le toca a cada persona cada día, con inicio y fin exactos y su origen: pauta, jornada pactada o manual) de una instalación o de una persona en un rango de fechas. Respeta el alcance del supervisor.",
  permiso: PERMISOS_CORE.personasLaboralRead,
  input: z
    .object({
      instalacionId: uuidSchema.optional(),
      personaId: uuidSchema.optional(),
      incluirNoVigentes: z.boolean().default(false),
    })
    .and(rangoSchema)
    .refine((i) => i.instalacionId || i.personaId, "Indica una instalación o una persona."),
  output: z.object({ items: z.array(turnoSchema), truncado: z.boolean() }),
  efecto: "lectura",
  dryRun: false,
  auditarLectura: (s) => s.items.map((t) => t.personaId),
  async handler(ctx, input) {
    const filas = await ctx.db.turnoEsperado.findMany({
      where: {
        fecha: { gte: new Date(`${input.desde}T00:00:00.000Z`), lte: new Date(`${input.hasta}T00:00:00.000Z`) },
        ...(input.incluirNoVigentes ? {} : { vigente: true }),
        // El alcance del supervisor se combina con el filtro pedido (AND), nunca lo reemplaza.
        AND: [dondeInstalacionId(ctx), input.instalacionId ? { instalacionId: input.instalacionId } : {}],
        ...(input.personaId ? { personaId: input.personaId } : {}),
      },
      orderBy: [{ inicio: "asc" }, { version: "asc" }],
      take: LIMITE + 1,
    });
    return {
      truncado: filas.length > LIMITE,
      items: filas.slice(0, LIMITE).map((f) => ({
        id: f.id, personaId: f.personaId, fecha: f.fecha.toISOString().slice(0, 10),
        inicio: f.inicio.toISOString(), fin: f.fin.toISOString(), instalacionId: f.instalacionId,
        puestoId: f.puestoId, origen: f.origen as "pauta" | "jornada_pactada" | "manual",
        referencia: f.referencia, colacionMin: f.colacionMin, feriado: f.feriado,
        horasEsperadas: Math.round(horasDeTurnoEsperado(f) * 100) / 100,
        version: f.version, vigente: f.vigente,
      })),
    };
  },
});

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
    .object({ puestoId: uuidSchema.optional(), desde: fechaCivilSchema.optional(), hasta: fechaCivilSchema.optional() })
    .refine((i) => (i.desde === undefined) === (i.hasta === undefined), "Indica «desde» y «hasta» juntos o ninguno.")
    .refine((i) => !i.desde || !i.hasta || i.hasta >= i.desde, "«hasta» no puede ser anterior a «desde».")
    .refine((i) => !i.desde || !i.hasta || dias(i.desde, i.hasta) <= 124, "Como máximo 124 días por vez."),
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
        const p = await ctx.db.puesto.findFirst({ where: { id: input.puestoId, ...dentro }, select: { id: true } });
        if (!p) throw noEncontrado("El puesto");
        ids = [p.id];
      } else {
        const series = await ctx.db.seriePauta.findMany({
          where: {
            vigenteDesde: { lte: new Date(`${hasta}T00:00:00.000Z`) },
            OR: [{ vigenteHasta: null }, { vigenteHasta: { gte: new Date(`${desde}T00:00:00.000Z`) } }],
          },
          select: { puestoId: true },
          distinct: ["puestoId"],
        });
        const visibles = await ctx.db.puesto.findMany({
          where: { id: { in: series.map((s) => s.puestoId) }, ...dentro }, select: { id: true },
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

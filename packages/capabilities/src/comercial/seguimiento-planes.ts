// Planes de seguimiento por tenant (CAR-67, ADR-021): lectura, guardado versionado y plan base.
import { z } from "zod";

import { planBasePorVertical, validarConfigPlan } from "@opai/domain";

import { uuidSchema } from "../core/esquemas";
import { defineCapability } from "../define";
import { noEncontrado, reglaDeNegocio } from "../errores";
import type { Contexto } from "../types";
import { PERMISO_CONFIG, PERMISO_READ } from "./comun";
import { configPlanSchema } from "./seguimiento-comun";
import { etapasInvalidasDePasos, etapasInvalidasDelPlan, validarEtapasDelPlan } from "./seguimiento-etapas";

const DISPARADORES_V1 = ["cotizacion_enviada", "manual"] as const;
const planSchema = z.object({
  id: z.string(), nombre: z.string(), disparador: z.string(), porDefecto: z.boolean(),
  activo: z.boolean(), version: z.number(), config: configPlanSchema, enCurso: z.number(),
  /** Etapas que el plan nombra y que ya no existen o están inactivas (se revalidan al leer). */
  etapasInvalidas: z.array(z.string()),
});

async function planes(ctx: Contexto): Promise<z.input<typeof planSchema>[]> {
  const filas = await ctx.db.planSeguimiento.findMany({ orderBy: { nombre: "asc" } });
  return Promise.all(
    filas.map(async (p) => {
      const [v, enCurso] = await Promise.all([
        ctx.db.planSeguimientoVersion.findUnique({ where: { planId_version: { planId: p.id, version: p.versionActual } } }),
        ctx.db.seguimiento.count({ where: { planId: p.id, estado: { in: ["activo", "pausado"] } } }),
      ]);
      const config = configPlanSchema.parse(v?.config);
      return {
        id: p.id, nombre: p.nombre, disparador: p.disparador, porDefecto: p.porDefecto, activo: p.activo,
        version: p.versionActual, config, enCurso,
        etapasInvalidas: [...(await etapasInvalidasDelPlan(ctx, config)).map((e) => e.mensaje), ...(await etapasInvalidasDePasos(ctx, config))],
      };
    }),
  );
}

export const seguimientoPlanesList = defineCapability({
  auditarLectura: () => [],
  id: "comercial.seguimiento_planes.list",
  descripcion:
    "Lista los planes de seguimiento comercial de la empresa con su versión vigente (pasos, días, canal, quién ejecuta, qué pasa al responder y al terminar) y cuántos seguimientos en curso usan cada uno.",
  permiso: PERMISO_READ,
  input: z.object({}),
  output: z.array(planSchema),
  efecto: "lectura",
  dryRun: false,
  handler: (ctx) => planes(ctx),
});

export const seguimientoPlanesGuardar = defineCapability({
  id: "comercial.seguimiento_planes.guardar",
  descripcion:
    "Crea un plan de seguimiento comercial o edita uno existente. Si cambian los pasos o las reglas se publica una versión nueva; los seguimientos en curso conservan la suya. Un solo plan por defecto por disparador.",
  permiso: PERMISO_CONFIG,
  input: z.object({
    id: uuidSchema.optional().describe("Sin id crea un plan nuevo."),
    nombre: z.string().trim().min(3).max(60),
    disparador: z.enum(DISPARADORES_V1),
    porDefecto: z.boolean().default(false),
    activo: z.boolean().default(true),
    config: configPlanSchema,
  }),
  output: planSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const errores = validarConfigPlan(input.config);
    if (errores.length) throw reglaDeNegocio(errores.join(" "));
    await validarEtapasDelPlan(ctx, input.config);
    const actual = input.id ? await ctx.db.planSeguimiento.findUnique({ where: { id: input.id } }) : null;
    if (input.id && !actual) throw noEncontrado("El plan");
    const repetido = await ctx.db.planSeguimiento.findFirst({
      where: { nombre: { equals: input.nombre, mode: "insensitive" }, ...(input.id ? { id: { not: input.id } } : {}) },
    });
    if (repetido) throw reglaDeNegocio("Ya existe un plan con ese nombre.");
    const previa = actual
      ? await ctx.db.planSeguimientoVersion.findUnique({ where: { planId_version: { planId: actual.id, version: actual.versionActual } } })
      : null;
    const cambia = !previa || JSON.stringify(configPlanSchema.parse(previa.config)) !== JSON.stringify(input.config);
    const version = actual ? actual.versionActual + (cambia ? 1 : 0) : 1;
    const vista = { nombre: input.nombre, disparador: input.disparador, porDefecto: input.porDefecto, activo: input.activo };
    if (dryRun) return { id: actual?.id ?? "", ...vista, version, config: input.config, enCurso: 0, etapasInvalidas: [] };
    const id = await ctx.transaccion(async (tx) => {
      if (input.porDefecto)
        await tx.planSeguimiento.updateMany({ where: { disparador: input.disparador, id: { not: actual?.id ?? "" } }, data: { porDefecto: false } });
      const p = actual
        ? await tx.planSeguimiento.update({ where: { id: actual.id }, data: { ...vista, versionActual: version } })
        : await tx.planSeguimiento.create({ data: { tenantId: ctx.tenantId, ...vista } });
      if (cambia)
        await tx.planSeguimientoVersion.create({ data: { tenantId: ctx.tenantId, planId: p.id, version, config: input.config, creadaPor: ctx.usuario?.id ?? null } });
      await ctx.eventos.emitir(tx, { tipo: "comercial.seguimiento.plan_actualizado", entidadTipo: "plan_seguimiento", entidadId: p.id, payload: { version } });
      return p.id;
    });
    const guardado = (await planes(ctx)).find((p) => p.id === id);
    if (!guardado) throw noEncontrado("El plan");
    return guardado;
  },
});

export const seguimientoPlanesCrearBase = defineCapability({
  id: "comercial.seguimiento_planes.crear_base",
  descripcion:
    "Crea el plan de seguimiento base de la vertical de la empresa (copia editable) si todavía no tiene ningún plan. Es la forma de partir en empresas que activaron Comercial antes del seguimiento.",
  permiso: PERMISO_CONFIG,
  input: z.object({}),
  output: z.object({ creado: z.boolean() }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, _i, { dryRun }) {
    if ((await ctx.db.planSeguimiento.count({})) > 0) return { creado: false };
    if (dryRun) return { creado: true };
    const t = await ctx.db.tenant.findUnique({ where: { id: ctx.tenantId }, select: { vertical: true } });
    const base = planBasePorVertical(t?.vertical ?? "");
    await ctx.transaccion(async (tx) => {
      const p = await tx.planSeguimiento.create({ data: { tenantId: ctx.tenantId, nombre: base.nombre, disparador: "cotizacion_enviada", porDefecto: true } });
      await tx.planSeguimientoVersion.create({ data: { tenantId: ctx.tenantId, planId: p.id, version: 1, config: base.config, creadaPor: ctx.usuario?.id ?? null } });
      await ctx.eventos.emitir(tx, { tipo: "comercial.seguimiento.plan_actualizado", entidadTipo: "plan_seguimiento", entidadId: p.id, payload: { version: 1 } });
    });
    return { creado: true };
  },
});

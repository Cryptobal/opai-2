import { z } from "zod";

import { defineCapability, noEncontrado, reglaDeNegocio, uuid7, type Contexto } from "@opai/capabilities";

import { horaSchema } from "./lineas-esquemas";
import { uuidSchema } from "./esquemas";
import { PERMISO_MODELO, PERMISO_READ } from "./permisos";

const tramoSchema = z.object({
  nombre: z.string().trim().min(1).max(60).describe("Nombre del tramo en la cotización, p. ej. «Día» o «Noche»."),
  patronId: uuidSchema.describe("Ciclo de turno del catálogo del núcleo (4x4, 7x7, continuo…)."),
  horaInicio: horaSchema,
  horaFin: horaSchema,
  diasSemana: z.array(z.number().int().min(1).max(7)).min(1).max(7).describe("1 = lunes … 7 = domingo."),
  posiciones: z.number().int().min(1).max(1000).describe("Puestos que crea este tramo al cotizar."),
});
const tramoSalida = tramoSchema.extend({ id: uuidSchema, patronNombre: z.string() });
const esquemaSalida = z.object({
  id: uuidSchema,
  nombre: z.string(),
  descripcion: z.string().nullable(),
  activo: z.boolean(),
  totalPuestos: z.number().int(),
  tramos: z.array(tramoSalida),
});

async function vistaEsquemas(ctx: Contexto, incluirInactivos: boolean, id?: string) {
  const filas = await ctx.db.cpqEsquemaCobertura.findMany({
    where: { ...(id ? { id } : {}), ...(incluirInactivos ? {} : { activo: true }) },
    orderBy: [{ orden: "asc" }, { nombre: "asc" }],
  });
  const tramos = await tramosDe(ctx, filas.map((f) => f.id));
  return filas.map((f) => {
    const ts = tramos.filter((t) => t.esquemaId === f.id);
    return {
      id: f.id,
      nombre: f.nombre,
      descripcion: f.descripcion,
      activo: f.activo,
      totalPuestos: ts.reduce((a, t) => a + t.posiciones, 0),
      tramos: ts.map(({ esquemaId: _e, ...t }) => t),
    };
  });
}

/** Tramos de los esquemas dados, con el nombre del ciclo (los ciclos viven en `core.patrones_turno`). */
export async function tramosDe(ctx: Contexto, esquemaIds: string[]) {
  const filas = await ctx.db.cpqEsquemaCoberturaTramo.findMany({
    where: { esquemaId: { in: esquemaIds } },
    orderBy: [{ orden: "asc" }, { createdAt: "asc" }],
  });
  const patrones = await ctx.db.patronTurno.findMany({ where: { id: { in: [...new Set(filas.map((t) => t.patronId))] } } });
  const nombre = new Map(patrones.map((p) => [p.id, p.nombre]));
  return filas.map((t) => ({
    id: t.id,
    esquemaId: t.esquemaId,
    nombre: t.nombre,
    patronId: t.patronId,
    patronNombre: nombre.get(t.patronId) ?? "",
    horaInicio: t.horaInicio,
    horaFin: t.horaFin,
    diasSemana: t.diasSemana,
    posiciones: t.posiciones,
  }));
}

export const esquemasCoberturaList = defineCapability({
  auditarLectura: (s) => s.items.map((i) => i.id),
  id: "cpq.esquemas_cobertura.list",
  descripcion:
    "Lista los esquemas de cobertura de la empresa (p. ej. «24/7» = 2 puestos 4x4 de día y 2 de noche) con sus tramos, ciclo, horario y puestos; son la unidad para cotizar un servicio completo.",
  permiso: PERMISO_READ,
  input: z.object({ incluirInactivos: z.boolean().default(false) }),
  output: z.object({ items: z.array(esquemaSalida) }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    return { items: await vistaEsquemas(ctx, input.incluirInactivos) };
  },
});

export const esquemasCoberturaGuardar = defineCapability({
  id: "cpq.esquemas_cobertura.guardar",
  descripcion:
    "Crea o actualiza un esquema de cobertura de la empresa con sus tramos (ciclo de turno, horario, días y puestos por tramo); con `activo: false` lo archiva sin borrar las cotizaciones que lo usaron.",
  permiso: PERMISO_MODELO,
  input: z.object({
    id: uuidSchema.optional().describe("Si se omite, se crea un esquema nuevo."),
    nombre: z.string().trim().min(1).max(80),
    descripcion: z.string().trim().max(300).nullable().optional(),
    activo: z.boolean().default(true),
    tramos: z.array(tramoSchema).min(1).max(20),
  }),
  output: z.object({ id: uuidSchema, totalPuestos: z.number().int() }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const ids = [...new Set(input.tramos.map((t) => t.patronId))];
    const patrones = await ctx.db.patronTurno.findMany({ where: { id: { in: ids }, activo: true }, select: { id: true } });
    if (patrones.length !== ids.length) throw reglaDeNegocio("Algún ciclo de turno no existe o está inactivo.");
    const igual = await ctx.db.cpqEsquemaCobertura.findFirst({ where: { nombre: input.nombre } });
    if (igual && igual.id !== input.id) throw reglaDeNegocio("Ya hay un esquema de cobertura con ese nombre.");
    if (input.id && !(await ctx.db.cpqEsquemaCobertura.findFirst({ where: { id: input.id } }))) {
      throw noEncontrado("El esquema de cobertura");
    }
    const totalPuestos = input.tramos.reduce((a, t) => a + t.posiciones, 0);
    if (dryRun) return { id: input.id ?? "00000000-0000-7000-8000-000000000000", totalPuestos };
    const datos = { nombre: input.nombre, descripcion: input.descripcion ?? null, activo: input.activo };
    const id = input.id ?? uuid7();
    if (input.id) await ctx.db.cpqEsquemaCobertura.update({ where: { id }, data: datos });
    else await ctx.db.cpqEsquemaCobertura.create({ data: { id, tenantId: ctx.tenantId, ...datos } });
    await ctx.db.cpqEsquemaCoberturaTramo.deleteMany({ where: { esquemaId: id } });
    for (const [i, t] of input.tramos.entries()) {
      await ctx.db.cpqEsquemaCoberturaTramo.create({
        data: { id: uuid7(), tenantId: ctx.tenantId, esquemaId: id, orden: i, ...t, diasSemana: [...new Set(t.diasSemana)].sort() },
      });
    }
    return { id, totalPuestos };
  },
});

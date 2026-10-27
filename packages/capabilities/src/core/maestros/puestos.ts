import { z } from "zod";

import { PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../../define";
import { noEncontrado, reglaDeNegocio } from "../../errores";
import type { Contexto } from "../../types";
import { uuidSchema } from "../esquemas";
import { dondePuesto } from "./alcance";
import { definidos, escribirConEvento, opcionalAFecha } from "./comun";
import { instalacionDe } from "./instalaciones";
import { camposPuesto, errorDePatron, puestoSchema, vistaPuesto } from "./puestos-vista";

async function puestoDe(ctx: Contexto, id: string) {
  // findFirst (no findUnique) para aplicar el alcance por filas: fuera de alcance = no encontrado.
  const p = await ctx.db.puesto.findFirst({ where: { id, AND: [dondePuesto(ctx)] } });
  if (!p) throw noEncontrado("El puesto");
  return p;
}

async function cargoActivo(ctx: Contexto, cargoId?: string) {
  if (!cargoId) return;
  const c = await ctx.db.cargo.findUnique({ where: { id: cargoId } });
  if (!c) throw noEncontrado("El cargo");
  if (!c.activo) throw reglaDeNegocio(`El cargo "${c.nombre}" está desactivado.`);
}

function validarPatron(diasTrabajo: number, diasDescanso: number) {
  const error = errorDePatron(diasTrabajo, diasDescanso);
  if (error) throw reglaDeNegocio(error);
}

const fechas = (d: {
  vigenteDesde?: string | null | undefined;
  vigenteHasta?: string | null | undefined;
}) => ({
  vigenteDesde: opcionalAFecha(d.vigenteDesde),
  vigenteHasta: opcionalAFecha(d.vigenteHasta),
});

export const puestosList = defineCapability({
  id: "core.puestos.list",
  descripcion:
    "Puestos de servicio de una instalación o de un cargo en todas las instalaciones: cargo, patrón de turno (p. ej. 4×4), horario, jornada y dotación.",
  permiso: PERMISOS_CORE.instalacionesRead,
  input: z
    .object({
      instalacionId: uuidSchema.optional(),
      cargoId: uuidSchema.optional().describe("Puestos de este cargo (p. ej. para elegir puesto)."),
      soloActivos: z.boolean().default(false),
    })
    .refine((i) => i.instalacionId || i.cargoId, "Envía instalacionId o cargoId."),
  output: z.array(puestoSchema.extend({ instalacion: z.string() })),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    const filas = await ctx.db.puesto.findMany({
      where: {
        AND: [dondePuesto(ctx)],
        ...(input.instalacionId ? { instalacionId: input.instalacionId } : {}),
        ...(input.cargoId ? { cargoId: input.cargoId } : {}),
        ...(input.soloActivos ? { estado: "activo" } : {}),
      },
      include: { instalacion: { select: { nombre: true } } },
      orderBy: { nombre: "asc" },
    });
    return filas.map((f) => ({ ...vistaPuesto(f), instalacion: f.instalacion.nombre }));
  },
});

export const puestosGet = defineCapability({
  id: "core.puestos.get",
  descripcion:
    "Ficha de un puesto de servicio: cargo, ciclo de turno, horario, dotación y vigencia.",
  permiso: PERMISOS_CORE.instalacionesRead,
  input: z.object({ id: uuidSchema }),
  output: puestoSchema,
  efecto: "lectura",
  dryRun: false,
  handler: async (ctx, input) => vistaPuesto(await puestoDe(ctx, input.id)),
});

export const puestosCreate = defineCapability({
  id: "core.puestos.create",
  descripcion:
    "Crea un puesto en una instalación con su cargo, ciclo (días de trabajo × descanso), horario (puede cruzar medianoche) y dotación.",
  permiso: PERMISOS_CORE.instalacionesManage,
  input: z.object({ instalacionId: uuidSchema, ...camposPuesto }),
  output: puestoSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const i = await instalacionDe(ctx, input.instalacionId);
    if (i.archivadaEn) throw reglaDeNegocio("La instalación está archivada.");
    await cargoActivo(ctx, input.cargoId);
    validarPatron(input.diasTrabajo, input.diasDescanso);
    const data = definidos({ ...input, ...fechas(input), estado: "activo" });
    if (dryRun) return vistaPuesto({ ...data, id: "" });
    const p = await escribirConEvento(
      ctx,
      { tipo: "core.puesto.creado", entidadTipo: "puesto" },
      (tx) => tx.puesto.create({ data: { ...data, tenantId: ctx.tenantId } }),
    );
    return vistaPuesto(p);
  },
});

export const puestosUpdate = defineCapability({
  id: "core.puestos.update",
  descripcion:
    "Actualiza un puesto (nombre, cargo, ciclo, horario, jornada, dotación, vigencia). Solo cambia lo enviado.",
  permiso: PERMISOS_CORE.instalacionesManage,
  input: z.object({ id: uuidSchema, ...z.object(camposPuesto).partial().shape }),
  output: puestoSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, { id, ...cambios }, { dryRun }) {
    const actual = await puestoDe(ctx, id);
    await cargoActivo(ctx, cambios.cargoId);
    validarPatron(
      cambios.diasTrabajo ?? actual.diasTrabajo,
      cambios.diasDescanso ?? actual.diasDescanso,
    );
    const data = definidos({ ...cambios, ...fechas(cambios) });
    if (dryRun) return vistaPuesto({ ...actual, ...data });
    const p = await escribirConEvento(
      ctx,
      { tipo: "core.puesto.actualizado", entidadTipo: "puesto" },
      (tx) => tx.puesto.update({ where: { id }, data }),
    );
    return vistaPuesto(p);
  },
});

export const puestosSetEstado = defineCapability({
  id: "core.puestos.set_estado",
  descripcion: "Activa o desactiva un puesto de servicio. Desactivar no borra su historial.",
  permiso: PERMISOS_CORE.instalacionesManage,
  input: z.object({ id: uuidSchema, estado: z.enum(["activo", "inactivo"]) }),
  output: puestoSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, { id, estado }, { dryRun }) {
    const actual = await puestoDe(ctx, id);
    if (dryRun) return vistaPuesto({ ...actual, estado });
    const p = await escribirConEvento(
      ctx,
      { tipo: "core.puesto.actualizado", entidadTipo: "puesto", payload: () => ({ estado }) },
      (tx) => tx.puesto.update({ where: { id }, data: { estado } }),
    );
    return vistaPuesto(p);
  },
});

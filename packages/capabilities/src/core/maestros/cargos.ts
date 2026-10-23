import { z } from "zod";

import { PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../../define";
import { uuidSchema } from "../esquemas";
import { definidos, escribirConEvento, sinDuplicado } from "./comun";
import { resumenSueldoSchema, sueldoVigentePorCargo } from "./cargos-resumen";
import {
  campos,
  cargoDe,
  cargoSchema,
  conteos,
  DUPLICADO,
  nombreLibre,
  vista,
} from "./cargos-vista";

export const cargosList = defineCapability({
  id: "core.cargos.list",
  descripcion:
    "Cargos de la empresa (guardia, supervisor, operario…) con personas con vínculo vigente, puestos activos y los montos de su estructura de sueldo vigente hoy.",
  permiso: PERMISOS_CORE.estructurasRead,
  input: z.object({ incluirInactivos: z.boolean().default(false) }),
  output: z.array(cargoSchema.extend({ sueldoVigente: resumenSueldoSchema })),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    const cargos = await ctx.db.cargo.findMany({
      where: input.incluirInactivos ? {} : { activo: true },
      orderBy: [{ orden: "asc" }, { nombre: "asc" }],
    });
    const sueldos = await sueldoVigentePorCargo(
      ctx,
      cargos.map((c) => c.id),
    );
    return Promise.all(
      cargos.map(async (c) => ({
        ...vista(c, await conteos(ctx, c.id)),
        sueldoVigente: sueldos.get(c.id) ?? null,
      })),
    );
  },
});

export const cargosGet = defineCapability({
  id: "core.cargos.get",
  descripcion:
    "Ficha de un cargo: clase, si su sueldo es sensible, estado y conteos de personas y puestos.",
  permiso: PERMISOS_CORE.estructurasRead,
  input: z.object({ id: uuidSchema }),
  output: cargoSchema,
  efecto: "lectura",
  dryRun: false,
  handler: async (ctx, input) => vista(await cargoDe(ctx, input.id), await conteos(ctx, input.id)),
});

export const cargosCreate = defineCapability({
  id: "core.cargos.create",
  descripcion:
    "Crea un cargo con nombre único. Su estructura de sueldo se define después con core.estructuras.create (nivel cargo).",
  permiso: PERMISOS_CORE.estructurasManage,
  input: z.object(campos),
  output: cargoSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    await nombreLibre(ctx, input.nombre);
    const data = definidos(input);
    if (dryRun) return vista({ ...data, id: "" });
    const c = await escribirConEvento(
      ctx,
      { tipo: "core.cargo.creado", entidadTipo: "cargo" },
      (tx) =>
        sinDuplicado(
          tx.cargo.create({ data: { activo: true, ...data, tenantId: ctx.tenantId } }),
          DUPLICADO,
        ),
    );
    return vista(c);
  },
});

export const cargosUpdate = defineCapability({
  id: "core.cargos.update",
  descripcion:
    "Actualiza un cargo (nombre, descripción, clase, sensibilidad del sueldo, orden). Solo cambia lo enviado.",
  permiso: PERMISOS_CORE.estructurasManage,
  input: z.object({
    id: uuidSchema,
    activo: z.boolean().optional(),
    ...z.object(campos).partial().shape,
  }),
  output: cargoSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, { id, ...cambios }, { dryRun }) {
    const actual = await cargoDe(ctx, id);
    await nombreLibre(ctx, cambios.nombre, id);
    const data = definidos(cambios);
    const n = await conteos(ctx, id);
    if (dryRun) return vista({ ...actual, ...data }, n);
    const c = await escribirConEvento(
      ctx,
      { tipo: "core.cargo.actualizado", entidadTipo: "cargo", payload: () => data },
      (tx) => sinDuplicado(tx.cargo.update({ where: { id }, data }), DUPLICADO),
    );
    return vista(c, n);
  },
});

export const cargosSetActivo = defineCapability({
  id: "core.cargos.set_activo",
  descripcion:
    "Activa o desactiva un cargo. Desactivar no borra: impide usarlo en puestos y vínculos nuevos.",
  permiso: PERMISOS_CORE.estructurasManage,
  input: z.object({ id: uuidSchema, activo: z.boolean() }),
  output: cargoSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, { id, activo }, { dryRun }) {
    const actual = await cargoDe(ctx, id);
    const n = await conteos(ctx, id);
    if (dryRun) return vista({ ...actual, activo }, n);
    const c = await escribirConEvento(
      ctx,
      { tipo: "core.cargo.actualizado", entidadTipo: "cargo", payload: () => ({ activo }) },
      (tx) => tx.cargo.update({ where: { id }, data: { activo } }),
    );
    return vista(c, n);
  },
});

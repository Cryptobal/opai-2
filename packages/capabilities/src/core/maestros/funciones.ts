import { z } from "zod";

import { PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../../define";
import { uuidSchema } from "../esquemas";
import { dondePuesto } from "./alcance";
import { definidos, escribirConEvento, sinDuplicado } from "./comun";
import {
  camposFuncion,
  conteoPuestosFuncion,
  DUPLICADO_FUNCION,
  funcionDe,
  funcionSchema,
  nombreFuncionLibre,
  vistaFuncion,
} from "./funciones-vista";

export const funcionesList = defineCapability({
  id: "core.funciones.list",
  descripcion:
    "Catálogo de funciones operativas del tenant (guardia, supervisor, nochero…): la función del puesto, distinta del cargo contractual. Incluye cuántos puestos activos usa cada una.",
  permiso: PERMISOS_CORE.funcionesRead,
  input: z.object({ incluirInactivos: z.boolean().default(false) }),
  output: z.array(funcionSchema),
  auditarLectura: (s) => s.map((i) => i.id),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    const filas = await ctx.db.funcionPuesto.findMany({
      where: input.incluirInactivos ? {} : { activo: true },
      orderBy: [{ orden: "asc" }, { nombre: "asc" }],
    });
    // El conteo respeta el alcance por filas del supervisor (ADR-022, Brief 07c B3): sin alcance
    // sobre una instalación, sus puestos no cuentan (fail-closed, nunca el total del tenant).
    const grupos = await ctx.db.puesto.groupBy({
      by: ["funcionId"],
      where: {
        estado: "activo",
        funcionId: { in: filas.map((f) => f.id) },
        AND: [dondePuesto(ctx)],
      },
      _count: { _all: true },
    });
    const conteo = new Map(grupos.map((g) => [g.funcionId, g._count._all]));
    return filas.map((f) => vistaFuncion(f, conteo.get(f.id) ?? 0));
  },
});

export const funcionesGet = defineCapability({
  id: "core.funciones.get",
  descripcion: "Ficha de una función de puesto: vertical, estado y puestos activos que la usan.",
  permiso: PERMISOS_CORE.funcionesRead,
  input: z.object({ id: uuidSchema }),
  output: funcionSchema,
  auditarLectura: (s) => [s.id],
  efecto: "lectura",
  dryRun: false,
  handler: async (ctx, input) =>
    vistaFuncion(await funcionDe(ctx, input.id), await conteoPuestosFuncion(ctx, input.id)),
});

export const funcionesCreate = defineCapability({
  id: "core.funciones.create",
  descripcion:
    "Crea una función operativa del tenant con nombre único (guardia, supervisor…). El supervisor es una función más, no un rol aparte.",
  permiso: PERMISOS_CORE.funcionesManage,
  input: z.object(camposFuncion),
  output: funcionSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    await nombreFuncionLibre(ctx, input.nombre);
    const data = definidos(input);
    if (dryRun) return vistaFuncion({ ...data, id: "" });
    const f = await escribirConEvento(
      ctx,
      { tipo: "core.funcion.creada", entidadTipo: "funcion_puesto" },
      (tx) =>
        sinDuplicado(
          tx.funcionPuesto.create({ data: { activo: true, ...data, tenantId: ctx.tenantId } }),
          DUPLICADO_FUNCION,
        ),
    );
    return vistaFuncion(f);
  },
});

export const funcionesUpdate = defineCapability({
  id: "core.funciones.update",
  descripcion:
    "Actualiza una función operativa (nombre, vertical, orden). Solo cambia lo enviado.",
  permiso: PERMISOS_CORE.funcionesManage,
  input: z.object({ id: uuidSchema, ...z.object(camposFuncion).partial().shape }),
  output: funcionSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, { id, ...cambios }, { dryRun }) {
    const actual = await funcionDe(ctx, id);
    await nombreFuncionLibre(ctx, cambios.nombre, id);
    const data = definidos(cambios);
    const n = await conteoPuestosFuncion(ctx, id);
    if (dryRun) return vistaFuncion({ ...actual, ...data }, n);
    const f = await escribirConEvento(
      ctx,
      { tipo: "core.funcion.actualizada", entidadTipo: "funcion_puesto", payload: () => data },
      (tx) => sinDuplicado(tx.funcionPuesto.update({ where: { id }, data }), DUPLICADO_FUNCION),
    );
    return vistaFuncion(f, n);
  },
});

export const funcionesSetActivo = defineCapability({
  id: "core.funciones.set_activo",
  descripcion:
    "Activa o desactiva una función de puesto. Desactivar no borra: impide elegirla en puestos nuevos.",
  permiso: PERMISOS_CORE.funcionesDesactivar,
  input: z.object({ id: uuidSchema, activo: z.boolean() }),
  output: funcionSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, { id, activo }, { dryRun }) {
    const actual = await funcionDe(ctx, id);
    const n = await conteoPuestosFuncion(ctx, id);
    if (dryRun) return vistaFuncion({ ...actual, activo }, n);
    const f = await escribirConEvento(
      ctx,
      { tipo: "core.funcion.actualizada", entidadTipo: "funcion_puesto", payload: () => ({ activo }) },
      (tx) => tx.funcionPuesto.update({ where: { id }, data: { activo } }),
    );
    return vistaFuncion(f, n);
  },
});

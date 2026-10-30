import { z } from "zod";

import { PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../../define";
import { noEncontrado } from "../../errores";
import { uuidSchema } from "../esquemas";
import { definidos, escribirConEvento, sinDuplicado } from "../maestros/comun";
import {
  diaVistaSchema,
  fechaCivilSchema,
  nombreFeriadoSchema,
  uuidOpcional,
  vista,
} from "./comun";

const DUPLICADO = "Ya hay un feriado del tenant para esa fecha y alcance.";

export const calendarioCrearFeriado = defineCapability({
  id: "core.calendario.crear_feriado",
  descripcion:
    "Agrega un feriado o día especial propio de la empresa, opcionalmente solo para una instalación; sobrescribe al nacional en esa fecha.",
  permiso: PERMISOS_CORE.calendarioManage,
  input: z.object({
    fecha: fechaCivilSchema,
    nombre: nombreFeriadoSchema,
    irrenunciable: z.boolean().default(false),
    instalacionId: uuidOpcional,
  }),
  output: diaVistaSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    if (input.instalacionId) {
      const inst = await ctx.db.instalacion.findUnique({
        where: { id: input.instalacionId },
        select: { id: true },
      });
      if (!inst) throw noEncontrado("La instalación");
    }
    const data = {
      tenantId: ctx.tenantId,
      fecha: new Date(`${input.fecha}T00:00:00.000Z`),
      tipo: "feriado",
      nombre: input.nombre,
      irrenunciable: input.irrenunciable,
      fuente: "tenant",
      region: null,
      instalacionId: input.instalacionId ?? null,
    };
    if (dryRun) return vista({ id: "", ...data });
    const r = await escribirConEvento(
      ctx,
      { tipo: "core.dia_calendario.creado", entidadTipo: "dia_calendario" },
      (tx) => sinDuplicado(tx.diaCalendario.create({ data }), DUPLICADO),
    );
    return vista(r);
  },
});

export const calendarioActualizar = defineCapability({
  id: "core.calendario.actualizar",
  descripcion:
    "Cambia el nombre o la marca de irrenunciable de un feriado propio de la empresa. Los feriados de plataforma no se editan.",
  permiso: PERMISOS_CORE.calendarioManage,
  input: z.object({
    id: uuidSchema,
    nombre: nombreFeriadoSchema.optional(),
    irrenunciable: z.boolean().optional(),
  }),
  output: diaVistaSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, { id, ...cambios }, { dryRun }) {
    return ctx.transaccion(async (tx) => {
      ctx = { ...ctx, db: tx, transaccion: (fn) => fn(tx) };
      if (typeof (ctx.db as { $executeRaw?: unknown }).$executeRaw === "function")
        await ctx.db
          .$executeRaw`SELECT id FROM core.dias_calendario WHERE id = ${id}::uuid AND tenant_id = ${ctx.tenantId}::uuid FOR UPDATE`;
      const actual = await ctx.db.diaCalendario.findFirst({
        where: { id, tenantId: ctx.tenantId, archivadaEn: null },
      });
      if (!actual) throw noEncontrado("El feriado");
      const data = definidos({ nombre: cambios.nombre, irrenunciable: cambios.irrenunciable });
      if (dryRun) return vista({ ...actual, ...data });
      const r = await escribirConEvento(
        ctx,
        { tipo: "core.dia_calendario.actualizado", entidadTipo: "dia_calendario", payload: () => data },
        (tx2) => tx2.diaCalendario.update({ where: { id }, data }),
      );
      return vista(r);
    });
  },
});

export const calendarioArchivar = defineCapability({
  id: "core.calendario.archivar",
  descripcion:
    "Archiva un feriado propio de la empresa para que deje de contar; no toca los feriados de plataforma.",
  permiso: PERMISOS_CORE.calendarioManage,
  input: z.object({ id: uuidSchema }),
  output: diaVistaSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, { id }, { dryRun }) {
    return ctx.transaccion(async (tx) => {
      ctx = { ...ctx, db: tx, transaccion: (fn) => fn(tx) };
      if (typeof (ctx.db as { $executeRaw?: unknown }).$executeRaw === "function")
        await ctx.db
          .$executeRaw`SELECT id FROM core.dias_calendario WHERE id = ${id}::uuid AND tenant_id = ${ctx.tenantId}::uuid FOR UPDATE`;
      const actual = await ctx.db.diaCalendario.findFirst({
        where: { id, tenantId: ctx.tenantId, archivadaEn: null },
      });
      if (!actual) throw noEncontrado("El feriado");
      if (dryRun) return vista(actual);
      const r = await escribirConEvento(
        ctx,
        { tipo: "core.dia_calendario.archivado", entidadTipo: "dia_calendario" },
        (tx2) => tx2.diaCalendario.update({ where: { id }, data: { archivadaEn: new Date() } }),
      );
      return vista(r);
    });
  },
});

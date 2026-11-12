import { z } from "zod";

import { defineCapability, noEncontrado } from "@opai/capabilities";
import type { Prisma } from "@opai/db";

import { PERMISO_BANCOS_GESTIONAR, PERMISO_BANCOS_VER } from "./permisos";
import { definicionReglaSchema, nombresDestino, reglaASalida, reglaSchema, validarDestino } from "./reglas-esquemas";

export const bancosReglasListar = defineCapability({
  id: "finanzas.reglas_banco.listar",
  descripcion:
    "Lista las reglas de conciliación del banco en orden de prioridad, con sus condiciones y la fila del flujo y cuenta contable a las que clasifican.",
  permiso: PERMISO_BANCOS_VER,
  input: z.object({}),
  output: z.object({ items: z.array(reglaSchema) }),
  efecto: "lectura",
  dryRun: false,
  auditarLectura: (s) => s.items.map((i) => i.id),
  async handler(ctx) {
    const filas = await ctx.db.reglaConciliacion.findMany({ orderBy: [{ prioridad: "desc" }, { nombre: "asc" }] });
    const n = await nombresDestino(
      ctx,
      filas.flatMap((r) => (r.flujoFilaId ? [r.flujoFilaId] : [])),
      filas.flatMap((r) => (r.cuentaContableId ? [r.cuentaContableId] : [])),
    );
    return { items: filas.map((r) => reglaASalida(r, n)) };
  },
});

const guardarInput = z.object({
  id: z.uuid().optional(),
  nombre: z.string().trim().min(2).max(120),
  prioridad: z.number().int().min(0).max(1000).default(0),
  modo: z.enum(["todas", "alguna"]).default("todas"),
  definicion: definicionReglaSchema,
  flujoFilaId: z.uuid(),
  cuentaContableId: z.uuid().nullish(),
  activa: z.boolean().default(true),
});

export const bancosReglasGuardar = defineCapability({
  id: "finanzas.reglas_banco.guardar",
  descripcion:
    "Crea o actualiza una regla de conciliación del banco: condiciones por RUT, glosa, monto o referencia, y la fila del flujo (y opcional la cuenta contable) a la que clasifica.",
  permiso: PERMISO_BANCOS_GESTIONAR,
  input: guardarInput,
  output: reglaSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    if (input.id) {
      const previa = await ctx.db.reglaConciliacion.findFirst({ where: { id: input.id }, select: { id: true } });
      if (!previa) throw noEncontrado("La regla");
    }
    await validarDestino(ctx.db, {
      flujoFilaId: input.flujoFilaId,
      cuentaContableId: input.cuentaContableId,
      alcance: input.definicion.alcance,
    });
    const data = {
      nombre: input.nombre,
      prioridad: input.prioridad,
      modo: input.modo,
      condiciones: input.definicion as Prisma.InputJsonValue,
      activa: input.activa,
      flujoFilaId: input.flujoFilaId,
      cuentaContableId: input.cuentaContableId ?? null,
    };
    const n = await nombresDestino(ctx, [input.flujoFilaId], input.cuentaContableId ? [input.cuentaContableId] : []);
    if (dryRun) return reglaASalida({ id: input.id ?? "00000000-0000-0000-0000-000000000002", ...data }, n);
    const row = await ctx.transaccion(async (tx) => {
      const r = input.id
        ? await tx.reglaConciliacion.update({ where: { id: input.id }, data })
        : await tx.reglaConciliacion.create({ data: { ...data, tenantId: ctx.tenantId } });
      await ctx.eventos.emitir(tx, {
        tipo: "finanzas.banco.regla_guardada",
        entidadTipo: "reglaConciliacion",
        entidadId: r.id,
        payload: { activa: r.activa },
      });
      return r;
    });
    return reglaASalida(row, n);
  },
});

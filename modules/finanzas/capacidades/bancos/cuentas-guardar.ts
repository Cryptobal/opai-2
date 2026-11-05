import { z } from "zod";

import { defineCapability, reglaDeNegocio } from "@opai/capabilities";
import { Prisma } from "@opai/db";

import { sinDuplicado } from "../esquemas";
import { cuentaSchema } from "./esquemas";
import { PERMISO_BANCOS_GESTIONAR } from "./permisos";

export const bancosCuentasGuardar = defineCapability({
  id: "finanzas.bancos.guardar",
  descripcion: "Crea o actualiza una cuenta bancaria del tenant y opcionalmente su mapeo de columnas genérico.",
  permiso: PERMISO_BANCOS_GESTIONAR,
  input: z.object({
    id: z.uuid().optional(),
    banco: z.string().trim().min(2).max(80),
    numeroVisible: z.string().trim().min(4).max(40),
    moneda: z.literal("CLP").default("CLP"),
    flujoFilaId: z.uuid().nullable().optional(),
    mapeoColumnas: z.record(z.string(), z.string()).nullable().optional(),
    activa: z.boolean().optional(),
  }),
  output: cuentaSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    if (input.flujoFilaId) {
      const fila = await ctx.db.flujoFila.findFirst({ where: { id: input.flujoFilaId } });
      if (!fila) throw reglaDeNegocio("La fila del flujo no existe.");
    }
    const data = {
      banco: input.banco,
      numeroVisible: input.numeroVisible,
      moneda: input.moneda,
      flujoFilaId: input.flujoFilaId ?? null,
      ...(input.mapeoColumnas !== undefined
        ? { mapeoColumnas: (input.mapeoColumnas ?? Prisma.DbNull) as Prisma.InputJsonValue }
        : {}),
      ...(input.activa !== undefined ? { activa: input.activa } : {}),
    };
    if (dryRun) {
      return {
        id: input.id ?? "00000000-0000-0000-0000-000000000001",
        ...data,
        flujoFilaId: data.flujoFilaId,
        activa: input.activa ?? true,
        ultimaSyncEn: null,
        saldoBanco: null,
      };
    }
    const guardado = await ctx.transaccion(async (tx) => {
      const row = input.id
        ? await tx.cuentaBancaria.update({ where: { id: input.id }, data })
        : await sinDuplicado(
            tx.cuentaBancaria.create({ data: { ...data, tenantId: ctx.tenantId, activa: input.activa ?? true } }),
            "Ya existe una cuenta con ese banco y número.",
          );
      await ctx.eventos.emitir(tx, {
        tipo: input.id ? "finanzas.banco.cuenta_actualizada" : "finanzas.banco.cuenta_creada",
        entidadTipo: "cuentaBancaria",
        entidadId: row.id,
      });
      return row;
    });
    return {
      id: guardado.id,
      banco: guardado.banco,
      numeroVisible: guardado.numeroVisible,
      moneda: guardado.moneda,
      flujoFilaId: guardado.flujoFilaId,
      activa: guardado.activa,
      ultimaSyncEn: guardado.ultimaSyncEn?.toISOString() ?? null,
      saldoBanco: guardado.saldoBanco === null ? null : Number(guardado.saldoBanco),
    };
  },
});

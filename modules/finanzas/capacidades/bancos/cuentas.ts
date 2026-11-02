import { z } from "zod";

import { defineCapability } from "@opai/capabilities";

import { cuentaSchema, montoDe } from "./esquemas";
import { PERMISO_BANCOS_VER } from "./permisos";

export const bancosCuentasListar = defineCapability({
  id: "finanzas.bancos.listar",
  descripcion: "Lista las cuentas bancarias del tenant con banco, número visible, moneda y fila de saldo del flujo.",
  permiso: PERMISO_BANCOS_VER,
  input: z.object({ activas: z.boolean().optional() }),
  output: z.object({ items: z.array(cuentaSchema) }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    const items = await ctx.db.cuentaBancaria.findMany({
      where: input.activas === undefined ? {} : { activa: input.activas },
      orderBy: [{ banco: "asc" }, { numeroVisible: "asc" }],
    });
    return {
      items: items.map((c) => ({
        id: c.id,
        banco: c.banco,
        numeroVisible: c.numeroVisible,
        moneda: c.moneda,
        flujoFilaId: c.flujoFilaId,
        activa: c.activa,
      })),
    };
  },
});

export const bancosSaldoSugerido = defineCapability({
  id: "finanzas.bancos.saldo_sugerido",
  descripcion:
    "Devuelve el saldo final de la última cartola importada para una cuenta (sugerencia al sellar la semana del flujo).",
  permiso: PERMISO_BANCOS_VER,
  input: z.object({ cuentaId: z.uuid().optional() }),
  output: z.object({
    saldo: z.number().int().nullable(),
    fechaCartola: z.string().nullable(),
    cuentaId: z.string().nullable(),
  }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    const cuenta = input.cuentaId
      ? await ctx.db.cuentaBancaria.findFirst({ where: { id: input.cuentaId } })
      : await ctx.db.cuentaBancaria.findFirst({ where: { activa: true }, orderBy: { createdAt: "asc" } });
    if (!cuenta) return { saldo: null, fechaCartola: null, cuentaId: null };
    const cartola = await ctx.db.cartolaImportada.findFirst({
      where: { cuentaId: cuenta.id },
      orderBy: { createdAt: "desc" },
    });
    if (!cartola) return { saldo: null, fechaCartola: null, cuentaId: cuenta.id };
    return {
      saldo: montoDe(cartola.saldoFinal),
      fechaCartola: cartola.fechaHasta ? cartola.fechaHasta.toISOString().slice(0, 10) : null,
      cuentaId: cuenta.id,
    };
  },
});

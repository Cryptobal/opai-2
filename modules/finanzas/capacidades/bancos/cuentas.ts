import { z } from "zod";

import { defineCapability } from "@opai/capabilities";
import { calcularSaldoSugeridoSemana, finSemanaIso } from "@opai/domain";

import { cuentaSchema, montoDe } from "./esquemas";
import { PERMISO_BANCOS_VER } from "./permisos";
import { aFecha, aIso } from "./util";

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
    "Suma el saldo posterior del último movimiento por cuenta activa hasta el cierre de la semana del flujo (sugerencia al sellar).",
  permiso: PERMISO_BANCOS_VER,
  input: z.object({
    cuentaId: z.uuid().optional(),
    semana: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
  }),
  output: z.object({
    saldo: z.number().int().nullable(),
    fechaCorte: z.string().nullable(),
    semana: z.string().nullable(),
    aviso: z.string().nullable(),
    cuentasSinSaldo: z.array(z.object({ cuentaId: z.string(), banco: z.string() })),
  }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    const finSemana = input.semana ? finSemanaIso(input.semana) : aIso(new Date());
    const cuentas = await ctx.db.cuentaBancaria.findMany({
      where: input.cuentaId ? { id: input.cuentaId } : { activa: true },
      orderBy: { createdAt: "asc" },
    });
    if (!cuentas.length) {
      return { saldo: null, fechaCorte: null, semana: input.semana ?? null, aviso: null, cuentasSinSaldo: [] };
    }

    const movs = await ctx.db.movimientoBancario.findMany({
      where: {
        cuentaId: { in: cuentas.map((c) => c.id) },
        fecha: { lte: aFecha(finSemana) },
      },
      select: { id: true, cuentaId: true, fecha: true, saldoDespues: true },
    });

    const { saldo, fechaCorte, cuentasSinSaldoIds } = calcularSaldoSugeridoSemana(
      cuentas.map((c) => c.id),
      movs.map((m) => ({
        id: m.id,
        cuentaId: m.cuentaId,
        fecha: aIso(m.fecha),
        saldoDespues: m.saldoDespues == null ? null : montoDe(m.saldoDespues),
      })),
      finSemana,
    );

    const cuentaPorId = new Map(cuentas.map((c) => [c.id, c.banco]));
    const cuentasSinSaldo = cuentasSinSaldoIds.map((id) => ({
      cuentaId: id,
      banco: cuentaPorId.get(id) ?? "",
    }));
    const aviso =
      cuentasSinSaldo.length > 0
        ? `Sin saldo en cartola para: ${cuentasSinSaldo.map((c) => c.banco).join(", ")}.`
        : null;

    return { saldo, fechaCorte, semana: input.semana ?? null, aviso, cuentasSinSaldo };
  },
});

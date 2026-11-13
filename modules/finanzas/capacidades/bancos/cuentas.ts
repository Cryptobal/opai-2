import { z } from "zod";

import { defineCapability } from "@opai/capabilities";
import { cuentaSchema } from "./esquemas";
import { PERMISO_BANCOS_VER } from "./permisos";
import { saldosDeCuentas } from "./saldo-cuentas";

export const bancosCuentasListar = defineCapability({
  id: "finanzas.bancos.listar",
  descripcion: "Lista las cuentas bancarias del tenant con banco, número visible, moneda y fila de saldo del flujo.",
  permiso: PERMISO_BANCOS_VER,
  input: z.object({ activas: z.boolean().optional() }),
  output: z.object({ items: z.array(cuentaSchema) }),
  efecto: "lectura",
  dryRun: false,
  auditarLectura: (s) => s.items.map((i) => i.id),
  async handler(ctx, input) {
    const items = await ctx.db.cuentaBancaria.findMany({
      where: input.activas === undefined ? {} : { activa: input.activas },
      orderBy: [{ banco: "asc" }, { numeroVisible: "asc" }],
    });
    const saldos = await saldosDeCuentas(ctx.db);
    return {
      items: items.map((c) => ({
        id: c.id,
        banco: c.banco,
        numeroVisible: c.numeroVisible,
        moneda: c.moneda,
        flujoFilaId: c.flujoFilaId,
        activa: c.activa,
        ultimaSyncEn: c.ultimaSyncEn?.toISOString() ?? null,
        saldoBanco: c.saldoBanco === null ? null : Number(c.saldoBanco),
        saldoHoy: saldos.get(c.id)?.saldoHoy ?? null,
        saldoDesde: saldos.get(c.id)?.saldoDesde ?? null,
        saldoFuente: saldos.get(c.id)?.saldoFuente ?? null,
        saldoMovimientosDespues: saldos.get(c.id)?.movimientosDespues ?? null,
      })),
    };
  },
});

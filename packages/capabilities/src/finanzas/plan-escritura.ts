import { PLANTILLA_CHILENA } from "@opai/domain";
import { z } from "zod";

import { defineCapability } from "../define";
import { PERMISO_PLAN } from "./comun";

export const planInicializar = defineCapability({
  id: "finanzas.plan.inicializar",
  descripcion:
    "Carga la plantilla chilena base del plan de cuentas (activos, pasivos, patrimonio, ingresos, costos y gastos) cuando el tenant aún no tiene plan. Si ya hay cuentas no cambia nada. Después el tenant lo edita libremente.",
  permiso: PERMISO_PLAN,
  input: z.object({}),
  output: z.object({ creadas: z.number().int(), yaInicializado: z.boolean() }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, _input, { dryRun }) {
    if ((await ctx.db.cuentaContable.count()) > 0) return { creadas: 0, yaInicializado: true };
    if (dryRun) return { creadas: PLANTILLA_CHILENA.length, yaInicializado: false };
    await ctx.transaccion(async (tx) => {
      const idPorCodigo = new Map<string, string>();
      for (const c of PLANTILLA_CHILENA) {
        const fila = await tx.cuentaContable.create({
          data: {
            tenantId: ctx.tenantId,
            codigo: c.codigo,
            nombre: c.nombre,
            tipo: c.tipo,
            naturaleza: c.naturaleza,
            grupo: c.grupo,
            exigeCentroCosto: c.exigeCentroCosto,
            aceptaAsientos: c.aceptaAsientos,
            padreId: c.padreCodigo ? (idPorCodigo.get(c.padreCodigo) ?? null) : null,
            claveSistema: c.claveSistema,
          },
        });
        idPorCodigo.set(c.codigo, fila.id);
      }
      await ctx.eventos.emitir(tx, {
        tipo: "finanzas.plan.inicializado",
        entidadTipo: "plan_cuentas",
        entidadId: ctx.tenantId,
        payload: { cuentas: PLANTILLA_CHILENA.length },
      });
    });
    return { creadas: PLANTILLA_CHILENA.length, yaInicializado: false };
  },
});


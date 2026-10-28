import { z } from "zod";

import { defineCapability } from "../define";
import type { Contexto } from "../types";
import { noEncontrado, reglaDeNegocio } from "../errores";
import { uuidSchema } from "../core/esquemas";
import { instalacionesEnAlcance } from "../core/maestros/alcance";
import { sinDuplicado } from "../core/maestros/comun";
import { PERMISO_MANAGE, etapaDe, negocioDe, tipoVinculoSchema } from "./comun";
import { emitirActualizado, instalacionesDeCuenta } from "./validaciones";

const salida = z.object({ negocioId: z.string(), total: z.number() });

/** Vínculos del negocio que el actor ve: el total no delata instalaciones fuera de su alcance. */
function visibles(ctx: Contexto, negocioId: string) {
  const ids = instalacionesEnAlcance(ctx);
  const where = { negocioId, ...(ids ? { instalacionId: { in: [...ids] } } : {}) };
  return ctx.db.negocioInstalacion.count({ where });
}

export const negociosVincularInstalacion = defineCapability({
  id: "comercial.negocios.vincular_instalacion",
  descripcion:
    "Vincula una instalación de la cuenta del negocio con su tipo (nueva, ampliación, renovación o reemplazo). El negocio lee los datos de la instalación, no los copia (R7).",
  permiso: PERMISO_MANAGE,
  input: z.object({
    negocioId: uuidSchema,
    instalacionId: uuidSchema,
    tipo: tipoVinculoSchema.default("nueva"),
  }),
  output: salida,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const negocio = await negocioDe(ctx, input.negocioId);
    // Misma regla que al crear: de la cuenta, en el alcance del actor (ADR-022) y sin archivar.
    await instalacionesDeCuenta(ctx, negocio.cuentaId, [{ instalacionId: input.instalacionId }]);
    const total = await visibles(ctx, negocio.id);
    if (dryRun) return { negocioId: negocio.id, total: total + 1 };
    await ctx.transaccion(async (tx) => {
      await sinDuplicado(
        tx.negocioInstalacion.create({
          data: {
            tenantId: ctx.tenantId,
            negocioId: negocio.id,
            instalacionId: input.instalacionId,
            tipo: input.tipo,
          },
        }),
        "Esa instalación ya está vinculada al negocio.",
      );
      await ctx.eventos.emitir(tx, {
        tipo: "comercial.negocio.actualizado",
        entidadTipo: "negocio",
        entidadId: negocio.id,
        payload: { vinculoInstalacion: input.instalacionId },
      });
    });
    return { negocioId: negocio.id, total: total + 1 };
  },
});

export const negociosDesvincularInstalacion = defineCapability({
  id: "comercial.negocios.desvincular_instalacion",
  descripcion:
    "Quita una instalación vinculada a un negocio. No borra la instalación ni su operación; solo deshace el vínculo con este negocio.",
  permiso: PERMISO_MANAGE,
  input: z.object({ negocioId: uuidSchema, instalacionId: uuidSchema }),
  output: salida,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const negocio = await negocioDe(ctx, input.negocioId);
    const vinculo = { negocioId: negocio.id, instalacionId: input.instalacionId };
    // Un actor acotado no toca vínculos con instalaciones fuera de su alcance (ADR-022).
    const enAlcance = instalacionesEnAlcance(ctx)?.includes(input.instalacionId) ?? true;
    if (!enAlcance || !(await ctx.db.negocioInstalacion.count({ where: vinculo }))) {
      throw noEncontrado("El vínculo con esa instalación");
    }
    const total = await ctx.db.negocioInstalacion.count({ where: { negocioId: negocio.id } });
    // R10: pasada la primera etapa, el negocio conserva al menos una instalación.
    if (total === 1 && (await etapaDe(ctx, negocio.etapaId)).orden > 0) {
      throw reglaDeNegocio("Un negocio que ya avanzó de etapa conserva al menos una instalación.");
    }
    const quedan = (await visibles(ctx, negocio.id)) - 1;
    if (dryRun) return { negocioId: negocio.id, total: quedan };
    await ctx.db.negocioInstalacion.deleteMany({ where: vinculo });
    await emitirActualizado(ctx, negocio.id, { desvinculoInstalacion: input.instalacionId });
    return { negocioId: negocio.id, total: quedan };
  },
});

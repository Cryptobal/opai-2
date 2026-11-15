import { z } from "zod";

import { esParteFinanzas, MODULO_FINANZAS, PARTES_FINANZAS } from "@opai/domain";

import { defineTrabajo } from "../../trabajos/registro";
import { aFecha } from "../maestros/comun";

/** Días antes del último día de la prueba gratis en que se avisa a la empresa (Carlos, 12-nov-2026). */
export const DIAS_AVISO_GRATIS = 2;

/**
 * Cada día cierra las pruebas gratis vencidas de la empresa (CAR-222): el módulo queda en solo
 * lectura (se ve y se lee, nada se borra). No toca un módulo que Plataforma ya empezó a cobrar o que
 * sigue en prueba por otra parte de Finanzas. Idempotente: una prueba cerrada no vuelve a cerrarse.
 */
export const trabajoPruebasGratis = defineTrabajo({
  tipo: "core.pruebas_gratis.cerrar",
  descripcion: "Cierra las pruebas gratis vencidas: el módulo queda en solo lectura.",
  payload: z.object({ dia: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }),
  periodicidad: "diaria",
  async handler(ctx, { dia }) {
    const tenantId = ctx.tenantId;
    const vencidas = await ctx.db.pruebaGratis.findMany({
      where: { tenantId, cerradaEn: null, hasta: { lt: aFecha(dia) } },
    });
    const cerradas: string[] = [];
    for (const p of vencidas) {
      const cerrada = await ctx.transaccion(async (tx) => {
        // Solo si sigue vencida: Plataforma pudo extenderla entre la lectura y aquí.
        const { count } = await tx.pruebaGratis.updateMany({
          where: { tenantId, moduloId: p.moduloId, cerradaEn: null, hasta: { lt: aFecha(dia) } },
          data: { cerradaEn: new Date() },
        });
        if (!count) return false;
        const modulo = esParteFinanzas(p.moduloId) ? MODULO_FINANZAS : p.moduloId;
        const ids = modulo === MODULO_FINANZAS ? [MODULO_FINANZAS, ...PARTES_FINANZAS] : [modulo];
        const abiertas = await tx.pruebaGratis.count({
          where: {
            tenantId,
            cerradaEn: null,
            moduloId: { in: [...ids], not: p.moduloId },
            hasta: { gte: aFecha(dia) },
          },
        });
        const conPrecio = await tx.cobroCondicion.count({
          where: { tenantId, moduloId: { in: ids } },
        });
        if (!abiertas && !conPrecio)
          await tx.tenantModule.updateMany({
            where: { tenantId, moduloId: modulo, estado: "trial" },
            data: { estado: "solo_lectura" },
          });
        await ctx.eventos.emitir(tx, {
          tipo: "core.prueba_gratis.vencida",
          entidadTipo: "modulo",
          payload: { moduloId: p.moduloId },
        });
        return true;
      });
      if (cerrada) cerradas.push(p.moduloId);
    }
    // Aviso a la empresa dos días antes del último día (ADR-071, adenda 7.3). Sale solo el día exacto:
    // va después de los cierres, para que un reintento por un cierre fallido no lo repita.
    const enDosDias = new Date(aFecha(dia).getTime() + DIAS_AVISO_GRATIS * 86_400_000);
    const porVencer = await ctx.db.pruebaGratis.findMany({
      where: { tenantId, cerradaEn: null, hasta: enDosDias },
    });
    const conPrecio = new Set(
      (await ctx.db.cobroCondicion.findMany({ where: { tenantId }, select: { moduloId: true } })).map(
        (c) => c.moduloId,
      ),
    );
    for (const p of porVencer)
      await ctx.transaccion((tx) =>
        ctx.eventos.emitir(tx, {
          tipo: "core.prueba_gratis.por_vencer",
          entidadTipo: "modulo",
          payload: {
            moduloId: p.moduloId,
            hasta: enDosDias.toISOString(),
            dias: DIAS_AVISO_GRATIS,
            // Con condición de cobro fijada no queda en solo lectura al vencer (igual que el cierre).
            pasaACobro: (esParteFinanzas(p.moduloId) || p.moduloId === MODULO_FINANZAS
              ? [MODULO_FINANZAS, ...PARTES_FINANZAS]
              : [p.moduloId]
            ).some((m) => conPrecio.has(m)),
          },
        }),
      );
    return { cerradas, avisadas: porVencer.map((p) => p.moduloId) };
  },
});

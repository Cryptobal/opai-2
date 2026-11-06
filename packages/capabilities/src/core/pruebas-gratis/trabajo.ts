import { z } from "zod";

import { esParteFinanzas, MODULO_FINANZAS, PARTES_FINANZAS } from "@opai/domain";

import { defineTrabajo } from "../../trabajos/registro";
import { aFecha } from "../maestros/comun";

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
    return { cerradas };
  },
});

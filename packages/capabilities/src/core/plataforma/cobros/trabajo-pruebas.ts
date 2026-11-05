import { z } from "zod";

import { operacionesEmpresa } from "@opai/db";

import { defineTrabajo } from "../../../trabajos/registro";
import { dia as aDia } from "../../maestros/comun";
import { DIAS_DE_AVISO, estadoAlVencer, estaVencida, pruebasEnCurso } from "./pruebas";

/**
 * Cada día revisa las pruebas de módulos de la empresa (ADR-071, adenda del 4-nov-2026):
 * - las que vencieron pasan a `activo` si Plataforma marcó «pasa a cobro» (el cobro corre desde el día
 *   siguiente) o a `solo_lectura` si no (se ve y se lee, nada se borra);
 * - a siete días de vencer emite `core.cobros.prueba_por_vencer`, que es el aviso a Plataforma.
 * Es idempotente: una prueba ya resuelta deja de estar en `trial`, y el aviso sale solo el día exacto.
 */
export const trabajoCobrosPruebas = defineTrabajo({
  tipo: "core.cobros.revisar_pruebas",
  descripcion:
    "Vence las pruebas de módulos (a cobro o solo lectura) y avisa a Plataforma siete días antes.",
  payload: z.object({ dia: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }),
  periodicidad: "diaria",
  async handler(ctx, { dia }) {
    const ops = operacionesEmpresa(ctx.db, ctx.tenantId);
    const condiciones = (await ops.condicionesCobro()).map((c) => ({
      moduloId: c.moduloId,
      pruebaHasta: c.pruebaHasta ? aDia(c.pruebaHasta) : null,
      pasaACobro: c.pasaACobro,
    }));
    const estados = new Map((await ops.modulos()).map((m) => [m.moduloId, m.estado]));
    const pruebas = pruebasEnCurso(condiciones, estados, dia);
    const vencidas: { moduloId: string; estado: string }[] = [];
    for (const p of pruebas.filter(estaVencida)) {
      const estado = estadoAlVencer(p);
      await ctx.transaccion(async (tx) => {
        await operacionesEmpresa(tx, ctx.tenantId).fijarModulo(p.moduloId, estado);
        await ctx.eventos.emitir(tx, {
          tipo: "core.cobros.prueba_vencida",
          payload: { moduloId: p.moduloId, estado, pasaACobro: p.pasaACobro },
        });
      });
      vencidas.push({ moduloId: p.moduloId, estado });
    }
    const avisadas = pruebas.filter((p) => p.diasRestantes === DIAS_DE_AVISO);
    for (const p of avisadas)
      await ctx.transaccion((tx) =>
        ctx.eventos.emitir(tx, {
          tipo: "core.cobros.prueba_por_vencer",
          payload: { moduloId: p.moduloId, pruebaHasta: p.pruebaHasta, pasaACobro: p.pasaACobro },
        }),
      );
    return { vencidas, avisadas: avisadas.map((p) => p.moduloId) };
  },
});

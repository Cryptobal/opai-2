import { defineConsumidor, valoresEfectivos } from "@opai/capabilities";

import { CAMPOS_CPQ } from "./persistencia/supuestos";

/**
 * Al apagar el ajuste `cpq.enlace_publico`, revoca los enlaces activos de la empresa: sin esto solo
 * dejaban de abrir y revivían al volver a encenderlo (CAR-162). Lee el valor vigente al correr: si
 * el ajuste ya volvió a estar encendido, no revoca. Idempotente (solo toca los no revocados). El `tenantId` va explícito en el filtro: no depende solo de RLS.
 */
export const consumidorCpqEnlace = defineConsumidor({
  id: "cpq.enlace_publico",
  descripcion: "Revoca los enlaces públicos de cotizaciones cuando la empresa apaga el ajuste.",
  eventos: ["core.config.cambiada"],
  async handler(ctx, ev) {
    const p = (ev.payload ?? {}) as Record<string, unknown>;
    if (p["modulo"] !== "cpq" || p["clave"] !== "enlace_publico") return;
    const v = await valoresEfectivos(ctx, CAMPOS_CPQ);
    if (v.get("cpq.enlace_publico")?.valor === true) return;
    await ctx.transaccion((tx) =>
      tx.cpqEnlaceCompartido.updateMany({
        where: { tenantId: ctx.tenantId, revocadoEn: null },
        data: { revocadoEn: new Date() },
      }),
    );
  },
});

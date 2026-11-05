import { z } from "zod";

import { defineConsumidor } from "../../eventos/consumidores";
import { horizonte, hoyEn, zonaDelTenant } from "./comun";
import { regenerarPuesto } from "./regenerar-pauta";

const fecha = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const payload = z.object({ puestoId: z.string().uuid(), desde: fecha, hasta: fecha.optional() });

/**
 * Regenera los turnos esperados de los días que tocó un cambio de la Pauta. Elegimos un consumidor
 * idempotente del outbox (ADR-029) y no la misma transacción de cada capacidad (ADR-077): regenerar
 * relee serie, excepciones y feriados y vuelve al mismo resultado cuantas veces se reintente, la
 * escritura de la Pauta no se alarga ni falla por esto, y el trabajo diario corrige cualquier
 * desfase. Una serie fijada rige «desde» en adelante, hasta el fin del horizonte.
 */
export const consumidorTurnosEsperados = defineConsumidor({
  id: "core.turnos_esperados.pauta",
  descripcion: "Mantiene los turnos esperados al fijar series o crear y anular excepciones de la Pauta.",
  eventos: ["pauta.serie.fijada", "pauta.excepcion.creada", "pauta.excepcion.anulada"],
  async handler(ctx, evento) {
    const p = payload.safeParse(evento.payload);
    if (!p.success) return;
    const zona = await zonaDelTenant(ctx);
    const fin = p.data.hasta ?? horizonte(hoyEn(zona)).hasta;
    await regenerarPuesto(ctx, p.data.puestoId, p.data.desde, fin < p.data.desde ? p.data.desde : fin, zona);
  },
});

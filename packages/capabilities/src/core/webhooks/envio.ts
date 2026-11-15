// CAR-352 parte 2: del outbox a la dirección de la empresa. El consumidor anota una entrega por
// destino suscrito y encola el trabajo; el trabajo envía firmado, reintenta con espera creciente y
// deja el registro. Ningún envío ocurre dentro del despacho del outbox (ADR-029).
import { z } from "zod";

import { MAX_INTENTOS_WEBHOOK } from "@opai/domain";

import { defineConsumidor } from "../../eventos/consumidores";
import { defineTrabajo } from "../../trabajos/registro";
import type { Contexto } from "../../types";
import { enviarUna } from "./envio-una";

export const TRABAJO_ENVIAR_WEBHOOKS = "core.webhooks.enviar";
/** Entregas por vuelta: van en paralelo y cada una espera como máximo 10 s. */
const LOTE = 10;
/** Mientras se envía, la entrega queda tomada por este tiempo (otra vuelta no la repite). */
const TOMADA_MS = 2 * 60_000;

export async function encolarEnvio(ctx: Contexto, cuando: Date, clave: string): Promise<void> {
  await ctx.transaccion((tx) =>
    ctx.trabajos.encolar(tx, {
      tipo: TRABAJO_ENVIAR_WEBHOOKS,
      programadoPara: cuando,
      claveUnica: `${TRABAJO_ENVIAR_WEBHOOKS}:${clave}`,
    }),
  );
}

export const consumidorWebhooks = defineConsumidor({
  id: "core.webhooks.anotar",
  descripcion: "Anota una entrega por cada destino de eventos activo suscrito al evento.",
  eventos: "*",
  async handler(ctx, ev) {
    const destinos = await ctx.db.webhookDestino.findMany({
      where: { activo: true, eventos: { has: ev.tipo } },
      select: { id: true },
    });
    if (!destinos.length) return;
    // Idempotente: el despacho puede reintentar el evento; la clave única evita duplicar.
    await ctx.db.webhookEntrega.createMany({
      data: destinos.map((d) => ({
        tenantId: ctx.tenantId,
        destinoId: d.id,
        eventoId: ev.id,
        tipo: ev.tipo,
      })),
      skipDuplicates: true,
    });
    await encolarEnvio(ctx, new Date(), ev.id);
  },
});

export const trabajoEnviarWebhooks = defineTrabajo({
  tipo: TRABAJO_ENVIAR_WEBHOOKS,
  descripcion: "Envía firmadas las entregas de eventos salientes que ya toca intentar.",
  payload: z.object({}).passthrough(),
  tiempoMaximoMs: 30_000,
  async handler(ctx) {
    const ahora = new Date();
    const vencidas = await ctx.db.webhookEntrega.findMany({
      where: { estado: "pendiente", proximoIntentoEn: { lte: ahora } },
      orderBy: { proximoIntentoEn: "asc" },
      take: LOTE,
      select: { id: true },
    });
    const tomadas: string[] = [];
    for (const { id } of vencidas) {
      // Tomar es atómico: si otra vuelta ya la tomó, aquí no se envía de nuevo.
      const r = await ctx.db.webhookEntrega.updateMany({
        where: { id, estado: "pendiente", proximoIntentoEn: { lte: ahora } },
        data: {
          proximoIntentoEn: new Date(ahora.getTime() + TOMADA_MS),
          intentos: { increment: 1 },
        },
      });
      if (r.count === 1) tomadas.push(id);
    }
    // Una entrega que falla por un error propio (no del destino) no frena a las demás ni la reprogramación.
    await Promise.allSettled(tomadas.map((id) => enviarUna(ctx, id, ahora)));
    // Lo que sigue pendiente se programa para su próximo intento (o ya, si quedó lote).
    const siguiente = await ctx.db.webhookEntrega.findFirst({
      where: { estado: "pendiente" },
      orderBy: { proximoIntentoEn: "asc" },
      select: { proximoIntentoEn: true },
    });
    if (siguiente) {
      const cuando = siguiente.proximoIntentoEn;
      // Si quedó lote vencido, la clave lleva la hora exacta de esta vuelta para no chocar con ella.
      // La clave única de trabajos vale para siempre: lleva la hora exacta para no repetirse.
      const clave = cuando > ahora ? cuando.toISOString() : `lote:${ahora.toISOString()}`;
      await encolarEnvio(ctx, cuando > ahora ? cuando : new Date(), clave);
    }
    return { enviadas: tomadas.length, maxIntentos: MAX_INTENTOS_WEBHOOK };
  },
});

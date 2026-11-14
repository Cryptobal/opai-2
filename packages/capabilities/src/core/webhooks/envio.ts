// CAR-352 parte 2: del outbox a la dirección de la empresa. El consumidor anota una entrega por
// destino suscrito y encola el trabajo; el trabajo envía firmado, reintenta con espera creciente y
// deja el registro. Ningún envío ocurre dentro del despacho del outbox (ADR-029).
import { z } from "zod";

import {
  cuerpoWebhook,
  ipInterna,
  MAX_INTENTOS_WEBHOOK,
  proximoIntentoWebhook,
} from "@opai/domain";
import { enviarWebhook } from "@opai/integrations";

import { defineConsumidor } from "../../eventos/consumidores";
import { defineTrabajo } from "../../trabajos/registro";
import type { Contexto } from "../../types";
import { descifrarSecreto } from "./comun";

export const TRABAJO_ENVIAR_WEBHOOKS = "core.webhooks.enviar";
/** Entregas por vuelta: van en paralelo y cada una espera como máximo 10 s. */
const LOTE = 10;
/** Mientras se envía, la entrega queda tomada por este tiempo (otra vuelta no la repite). */
const TOMADA_MS = 2 * 60_000;

/** Se reemplaza solo en las pruebas, que no salen a la red. */
export const enviador = { enviar: enviarWebhook };

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

/** Envía una entrega ya tomada y deja su estado: ok, reintento programado o error. */
async function enviarUna(ctx: Contexto, id: string, ahora: Date): Promise<Date | null> {
  const e = await ctx.transaccion(async (tx) => {
    await tx.$queryRaw`/* 07d:bloqueo-dek */ SELECT id FROM core.claves_tenant WHERE tenant_id = ${ctx.tenantId}::uuid FOR SHARE`;
    const fila = await tx.webhookEntrega.findUnique({
      where: { id },
      include: { destino: true, evento: true },
    });
    if (!fila) return null;
    const secreto = fila.destino.activo
      ? await descifrarSecreto({ ...ctx, db: tx }, fila.destino)
      : null;
    return { fila, secreto };
  });
  if (!e) return null;
  const { fila, secreto } = e;
  if (!secreto) {
    await ctx.db.webhookEntrega.update({
      where: { id },
      data: { estado: "error", ultimoError: "Destino pausado" },
    });
    return null;
  }
  const r = await enviador.enviar({
    url: fila.destino.url,
    secreto,
    cuerpo: cuerpoWebhook(fila.evento),
    eventoId: fila.eventoId,
    ipPermitida: (ip) => !ipInterna(ip),
    ahora,
  });
  const intentos = fila.intentos + 1;
  const proximo = r.ok ? null : proximoIntentoWebhook(intentos, ahora);
  await ctx.db.webhookEntrega.update({
    where: { id },
    data: {
      intentos,
      estado: r.ok ? "ok" : proximo ? "pendiente" : "error",
      ultimoCodigo: r.codigo,
      ultimoError: r.error,
      duracionMs: r.duracionMs,
      ...(r.ok ? { entregadaEn: ahora } : {}),
      ...(proximo ? { proximoIntentoEn: proximo } : {}),
    },
  });
  return proximo;
}

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
        data: { proximoIntentoEn: new Date(ahora.getTime() + TOMADA_MS) },
      });
      if (r.count === 1) tomadas.push(id);
    }
    await Promise.all(tomadas.map((id) => enviarUna(ctx, id, ahora)));
    // Lo que sigue pendiente se programa para su próximo intento (o ya, si quedó lote).
    const siguiente = await ctx.db.webhookEntrega.findFirst({
      where: { estado: "pendiente" },
      orderBy: { proximoIntentoEn: "asc" },
      select: { proximoIntentoEn: true },
    });
    if (siguiente) {
      const cuando = siguiente.proximoIntentoEn;
      // Si quedó lote vencido, la clave lleva la hora exacta de esta vuelta para no chocar con ella.
      const clave =
        cuando > ahora ? cuando.toISOString().slice(0, 16) : `lote:${ahora.toISOString()}`;
      await encolarEnvio(ctx, cuando > ahora ? cuando : new Date(), clave);
    }
    return { enviadas: tomadas.length, maxIntentos: MAX_INTENTOS_WEBHOOK };
  },
});

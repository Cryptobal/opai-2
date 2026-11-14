// CAR-352 parte 2: el envío de una entrega ya tomada por la vuelta del trabajo.
import { cuerpoWebhook, ipInterna, proximoIntentoWebhook } from "@opai/domain";
import { enviarWebhook } from "@opai/integrations";

import type { Contexto } from "../../types";
import { descifrarSecreto } from "./comun";

/** Se reemplaza solo en las pruebas, que no salen a la red. */
export const enviador = { enviar: enviarWebhook };

/** Envía una entrega ya tomada y deja su estado: ok, reintento programado o error. */
export async function enviarUna(ctx: Contexto, id: string, ahora: Date): Promise<Date | null> {
  const e = await ctx.transaccion(async (tx) => {
    await tx.$queryRaw`/* 07d:bloqueo-dek */ SELECT id FROM core.claves_tenant WHERE tenant_id = ${ctx.tenantId}::uuid FOR SHARE`;
    const fila = await tx.webhookEntrega.findUnique({
      where: { id },
      select: {
        intentos: true,
        eventoId: true,
        destino: {
          select: {
            url: true,
            activo: true,
            secretoCifrado: true,
            secretoIv: true,
            secretoTag: true,
          },
        },
        // Sin `payload`: el cuerpo enviado nunca lo lleva.
        evento: {
          select: { id: true, tipo: true, entidadTipo: true, entidadId: true, createdAt: true },
        },
      },
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
    await ctx.db.webhookEntrega.updateMany({
      where: { id, intentos: fila.intentos },
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
  // El intento ya se sumó al tomarla: si esta vuelta cayó a mitad, igual cuenta. Solo se escribe si
  // la entrega sigue tomada por esta vuelta (nadie más sumó un intento entretanto).
  const intentos = fila.intentos;
  const proximo = r.ok ? null : proximoIntentoWebhook(intentos, ahora);
  await ctx.db.webhookEntrega.updateMany({
    where: { id, intentos },
    data: {
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

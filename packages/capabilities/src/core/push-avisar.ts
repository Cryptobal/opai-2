import type { Contexto } from "../types";

/**
 * Toca el celular de cada usuario con sus dispositivos suscritos (CAR-356 PR 4a). Va **después** del aviso en
 * la campana y nunca lo reemplaza: sin claves VAPID o sin suscripciones no hace nada. Borra las suscripciones
 * que el servicio de push dio por vencidas y mide cada envío en `core.consumos` (ADR-031). Nunca lanza: un
 * fallo de red no debe reintentar el consumidor ni duplicar los avisos de la campana.
 */
export async function avisarAlCelular(
  ctx: Contexto,
  usuarioIds: readonly string[],
  modulo: string,
) {
  const emisor = ctx.servicios.push;
  if (!emisor || usuarioIds.length === 0) return;
  const suscripciones = await ctx.db.suscripcionPush.findMany({
    where: { usuarioId: { in: [...new Set(usuarioIds)] } },
    select: { id: true, endpoint: true },
  });
  for (const s of suscripciones) {
    try {
      const r = await emisor.avisar(s.endpoint);
      if (r.vencida) await ctx.db.suscripcionPush.deleteMany({ where: { id: s.id } });
      else if (r.ok)
        await ctx.db.suscripcionPush.updateMany({
          where: { id: s.id },
          data: { ultimoAvisoEn: new Date() },
        });
      await ctx.medidor.registrar({
        tenantId: ctx.tenantId,
        recurso: "push.aviso",
        unidad: "envio",
        cantidad: 1,
        modulo,
        actorTipo: "system",
        ok: r.ok,
      });
    } catch {
      // Red caída o servicio de push sin respuesta: el aviso ya quedó en la campana.
    }
  }
}

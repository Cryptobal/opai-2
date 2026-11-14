import { type CategoriaAviso, enSilencio, normalizarPreferencias } from "@opai/domain";

import type { Contexto } from "../types";
import { zonaDelTenant } from "./turnos/comun";

/** «HH:mm» en la zona del tenant. */
const horaEn = (zona: string, ahora: Date) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: zona, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(
    ahora,
  );

/**
 * Usuarios que quieren el aviso al celular de esta categoría y no están en su horario de silencio. Las
 * preferencias son de la persona (Notificaciones del portal del trabajador); sin elección, ningún canal externo
 * está activo (ADR-020): por defecto no se toca el celular.
 */
async function quierenPush(ctx: Contexto, usuarioIds: string[], categoria: CategoriaAviso, ahora: Date) {
  const personas = await ctx.db.persona.findMany({
    where: { usuarioId: { in: usuarioIds } },
    select: { id: true, usuarioId: true },
  });
  if (personas.length === 0) return [];
  const prefs = await ctx.db.preferenciaNotificacion.findMany({
    where: { personaId: { in: personas.map((p) => p.id) } },
    select: { personaId: true, preferencias: true, silencioDesde: true, silencioHasta: true },
  });
  const hora = horaEn(await zonaDelTenant(ctx), ahora);
  const si = new Set<string>();
  for (const f of prefs) {
    if (!normalizarPreferencias(f.preferencias)[categoria].push) continue;
    if (enSilencio(hora, f.silencioDesde, f.silencioHasta)) continue;
    const u = personas.find((p) => p.id === f.personaId)?.usuarioId;
    if (u) si.add(u);
  }
  return [...si];
}

/**
 * Toca el celular de cada usuario con sus dispositivos suscritos (CAR-356 PR 4a), si eligió el aviso al celular
 * de esa categoría y no está en su horario de silencio. Va **después** del aviso en la campana y nunca lo
 * reemplaza: sin claves VAPID, sin preferencia o sin suscripciones no hace nada. Borra las suscripciones que el
 * servicio dio por vencidas y mide cada envío en `core.consumos` (ADR-031). Nunca lanza: un fallo de red no debe
 * reintentar el consumidor; si el consumidor se reintenta por otra causa, el push de ese intento se pierde (la
 * campana ya lo tiene), nunca se duplica.
 */
export async function avisarAlCelular(
  ctx: Contexto,
  usuarioIds: readonly string[],
  categoria: CategoriaAviso,
  modulo: string,
  ahora: Date = new Date(),
) {
  const emisor = ctx.servicios.push;
  if (!emisor || usuarioIds.length === 0) return;
  try {
    const destino = await quierenPush(ctx, [...new Set(usuarioIds)], categoria, ahora);
    if (destino.length === 0) return;
    const suscripciones = await ctx.db.suscripcionPush.findMany({
      where: { usuarioId: { in: destino } },
      select: { id: true, endpoint: true },
    });
    for (const s of suscripciones) {
      const r = await emisor.avisar(s.endpoint).catch(() => ({ ok: false, estado: 0, vencida: false }));
      if (r.vencida) await ctx.db.suscripcionPush.deleteMany({ where: { id: s.id } });
      else if (r.ok)
        await ctx.db.suscripcionPush.updateMany({ where: { id: s.id }, data: { ultimoAvisoEn: new Date() } });
      await ctx.medidor.registrar({
        tenantId: ctx.tenantId,
        recurso: "push.aviso",
        unidad: "envio",
        cantidad: 1,
        modulo,
        actorTipo: "system",
        ok: r.ok,
      });
    }
  } catch {
    // Base o red con problemas: el aviso ya quedó en la campana.
  }
}

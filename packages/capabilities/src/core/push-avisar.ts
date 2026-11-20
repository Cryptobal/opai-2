import { type CategoriaAviso, enSilencio, normalizarPreferencias } from "@opai/domain";

import type { Contexto } from "../types";
import { zonaDelTenant } from "./turnos/comun";

/** «HH:mm» en la zona del tenant. */
const horaEn = (zona: string, ahora: Date) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: zona, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(
    ahora,
  );

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
 * reemplaza: sin claves VAPID ni cuenta Firebase, sin preferencia o sin suscripciones no hace nada. Borra las
 * suscripciones que el servicio dio por vencidas y mide cada envío en `core.consumos` (ADR-031). Nunca lanza.
 */
export async function avisarAlCelular(
  ctx: Contexto,
  usuarioIds: readonly string[],
  categoria: CategoriaAviso,
  modulo: string,
  ahora: Date = new Date(),
  ruta: string = "/bandeja",
) {
  const emisorWeb = ctx.servicios.push;
  const emisorNativo = ctx.servicios.pushNativo;
  if ((!emisorWeb && !emisorNativo) || usuarioIds.length === 0) return;
  try {
    const destino = await quierenPush(ctx, [...new Set(usuarioIds)], categoria, ahora);
    if (destino.length === 0) return;
    const suscripciones = await ctx.db.suscripcionPush.findMany({
      where: { usuarioId: { in: destino } },
      select: { id: true, tipo: true, endpoint: true, token: true, plataforma: true },
    });
    for (const s of suscripciones) {
      let r: { ok: boolean; estado: number; vencida: boolean };
      if (s.tipo === "nativa" && s.token && emisorNativo) {
        const plataforma = s.plataforma === "ios" ? "ios" : "android";
        r = await emisorNativo
          .avisar(s.token, plataforma, ruta)
          .catch(() => ({ ok: false, estado: 0, vencida: false }));
      } else if (s.endpoint && emisorWeb) {
        r = await emisorWeb.avisar(s.endpoint).catch(() => ({ ok: false, estado: 0, vencida: false }));
      } else continue;
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
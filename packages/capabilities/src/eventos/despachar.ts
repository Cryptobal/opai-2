import type { Contexto } from "../types";
import { consumidoresDe, type EventoPublicado } from "./consumidores";

/** Reintentos de un evento antes de marcarlo en error (visible en Plataforma). */
export const MAX_INTENTOS_EVENTO = 5;
const PROCESANDO_VENCE_MS = 10 * 60_000;

/**
 * Despacha el outbox de un tenant: cada evento pendiente se reclama (pendiente → procesando, atómico),
 * se entrega a cada consumidor que aún no lo procesó con éxito y queda publicado o se reintenta.
 * Un consumidor que falla no bloquea a los demás. `ctx` es un contexto de sistema del tenant.
 */
export async function despacharPendientes(ctx: Contexto, limite = 50) {
  const db = ctx.db;
  // Eventos que quedaron "procesando" por una caída vuelven a la cola.
  await db.evento.updateMany({
    where: { estado: "procesando", updatedAt: { lt: new Date(Date.now() - PROCESANDO_VENCE_MS) } },
    data: { estado: "pendiente" },
  });
  const pendientes = await db.evento.findMany({
    where: { estado: "pendiente" },
    orderBy: { createdAt: "asc" },
    take: limite,
  });
  let publicados = 0;
  let errores = 0;
  for (const ev of pendientes) {
    const reclamo = await db.evento.updateMany({
      where: { id: ev.id, estado: "pendiente" },
      data: { estado: "procesando" },
    });
    if (reclamo.count !== 1) continue;
    const fallos = await entregar(ctx, ev);
    if (fallos.length === 0) {
      publicados += 1;
      await db.evento.update({
        where: { id: ev.id },
        data: { estado: "publicado", publicadoEn: new Date(), error: null },
      });
    } else {
      errores += 1;
      const intentos = ev.intentos + 1;
      await db.evento.update({
        where: { id: ev.id },
        data: {
          estado: intentos >= MAX_INTENTOS_EVENTO ? "error" : "pendiente",
          intentos,
          error: fallos.join(" | ").slice(0, 2000),
        },
      });
    }
  }
  return { revisados: pendientes.length, publicados, errores };
}

async function entregar(ctx: Contexto, ev: EventoPublicado): Promise<string[]> {
  const previas = await ctx.db.eventoEntrega.findMany({ where: { eventoId: ev.id } });
  const fallos: string[] = [];
  for (const c of consumidoresDe(ev.tipo)) {
    const previa = previas.find((p) => p.consumidor === c.id);
    if (previa?.estado === "ok") continue;
    let estado = "ok";
    let error: string | null = null;
    try {
      await c.handler(ctx, ev);
    } catch (e) {
      estado = "error";
      error = e instanceof Error ? e.message : String(e);
      fallos.push(`${c.id}: ${error}`);
    }
    const clave = {
      tenantId_eventoId_consumidor: { tenantId: ctx.tenantId, eventoId: ev.id, consumidor: c.id },
    };
    await ctx.db.eventoEntrega.upsert({
      where: clave,
      create: { tenantId: ctx.tenantId, eventoId: ev.id, consumidor: c.id, estado, error },
      update: { estado, error, intentos: (previa?.intentos ?? 0) + 1 },
    });
  }
  return fallos;
}

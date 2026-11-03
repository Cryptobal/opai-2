import type { Contexto } from "@opai/capabilities";

import {
  enriquecerEnvio,
  enriquecerMargen,
  filasEnvio,
  filasMargen,
} from "./aprobaciones-bandeja-enriquecer";
import type { ItemBandejaCpq } from "./aprobaciones-bandeja-tipos";

export type { ItemBandejaCpq } from "./aprobaciones-bandeja-tipos";

async function nombresUsuarios(ctx: Contexto, ids: string[]) {
  if (!ids.length) return new Map<string, string>();
  const rows = await ctx.db.membership.findMany({
    where: { tenantId: ctx.tenantId, userId: { in: [...new Set(ids)] } },
    include: { user: { select: { name: true } } },
  });
  return new Map(rows.map((m) => [m.userId, m.user?.name ?? "Usuario"]));
}

export async function contarPendientesBandejaCpq(ctx: Contexto) {
  let total = 0;
  if (ctx.autorizar("cpq:aprobar")) {
    total += await ctx.db.cpqAprobacion.count({ where: { estado: "pendiente" } });
  }
  if (ctx.autorizar("cpq:envios.aprobar")) {
    total += await ctx.db.cpqPropuestaEnvio.count({ where: { estado: "pendiente_aprobacion" } });
  }
  return total;
}

export async function listarBandejaCpq(ctx: Contexto, historial: boolean) {
  const baseUrl = ctx.servicios.urlBase.replace(/\/$/, "");
  const items: ItemBandejaCpq[] = [];
  const idsNombre: string[] = [];

  if (ctx.autorizar("cpq:aprobar")) {
    const filas = await filasMargen(ctx, historial);
    idsNombre.push(...filas.map((f) => f.solicitadaPorId));
    const nombres = await nombresUsuarios(ctx, idsNombre);
    for (const f of filas) items.push(await enriquecerMargen(ctx, f, nombres, baseUrl));
  }

  if (ctx.autorizar("cpq:envios.aprobar")) {
    const filas = await filasEnvio(ctx, historial);
    idsNombre.push(...filas.map((f) => f.solicitadoPorId));
    const nombres = await nombresUsuarios(ctx, idsNombre);
    for (const f of filas) {
      const item = await enriquecerEnvio(ctx, f, nombres, baseUrl);
      if (item) items.push(item);
    }
  }

  return items.sort((a, b) => b.creadaEn.localeCompare(a.creadaEn));
}

export async function obtenerBandejaCpq(ctx: Contexto, id: string) {
  const lista = await listarBandejaCpq(ctx, false);
  const hist = await listarBandejaCpq(ctx, true);
  return [...lista, ...hist].find((x) => x.id === id) ?? null;
}

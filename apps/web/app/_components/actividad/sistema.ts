import type { ItemTimeline } from "@opai/ds";

import { haceCuanto, hora } from "@/lib/fechas";
import { ejecutarComoUsuario } from "@/lib/servidor";
import type { Actividad } from "@/lib/tipos-maestros";

import type { ItemOrdenado } from "./tipos";

type Etapa = { id: string; de: string | null; a: string; cuando: string; motivo: string | null };

/** Cambios de etapa de un negocio como eventos de sistema de la línea de tiempo. */
export const itemsDeEtapas = (historial: readonly Etapa[]): ItemOrdenado[] =>
  historial.map((h) => ({
    id: `etapa-${h.id}`,
    orden: h.cuando,
    actor: { nombre: "OPAI", agente: true },
    accion: h.de ? `movió el negocio de ${h.de} a ${h.a}` : `creó el negocio en ${h.a}`,
    cuando: `${hora(h.cuando)} · ${haceCuanto(h.cuando)}`,
    ...(h.motivo ? { meta: h.motivo } : {}),
  }));

/** Auditoría de una cuenta o instalación como eventos de sistema (`core.actividad.list`). */
export async function itemsDeAuditoria(
  entidad: { tipo: "cuenta" | "instalacion"; id: string },
): Promise<ItemOrdenado[]> {
  const r = await ejecutarComoUsuario<Actividad>("erp", "core.actividad.list", { entidad, limite: 30 });
  if (!r.ok) return [];
  return r.data.items.map((i): ItemTimeline & { orden: string } => ({
    id: `aud-${i.id}`,
    orden: i.cuando,
    actor: { nombre: i.actor.nombre, agente: i.actor.agente },
    accion: i.accion,
    cuando: `${hora(i.cuando)} · ${haceCuanto(i.cuando)}`,
    meta: i.via ? `vía ${i.via}` : "desde OPAI",
  }));
}

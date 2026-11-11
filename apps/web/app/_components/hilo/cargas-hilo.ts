import type { FilaHilo, ListaHilo, PendienteHilo } from "@opai/ds";
import type { Resultado } from "@opai/capabilities";

import {
  actividadHilo,
  agendaHilo,
  estadoDeFallo,
  type PendienteInicio,
  pendientesHilo,
} from "./datos-hilo";

/** Ejecuta una capacidad de lectura del portal (en la app, `ejecutarCapacidad` con el portal fijo). */
export type EjecutarHilo = (id: string, input: Record<string, unknown>) => Promise<Resultado>;

const ERROR = { estado: "error", items: [] } as const;

/**
 * Pendientes del hilo: lo que espera una decisión más los avisos sin leer. Devuelve `null` si no se
 * pudo leer (falla o sin red): quien llama conserva lo que mostraba o pasa a error. Si solo fallan
 * los contadores, los pendientes se muestran igual, sin el aviso.
 */
export async function cargarPendientesHilo(
  ejecutar: EjecutarHilo,
): Promise<ListaHilo<PendienteHilo> | null> {
  const [p, c] = await Promise.all([
    ejecutar("core.inicio.pendientes", {}).catch(() => null),
    ejecutar("core.resumen.contadores", { campos: ["notificacionesNoLeidas"] }).catch(() => null),
  ]);
  if (!p?.ok) return null;
  const avisos = c?.ok
    ? ((c.data as { notificacionesNoLeidas: number | null }).notificacionesNoLeidas ?? 0)
    : 0;
  return { estado: "listo", items: pendientesHilo(p.data as PendienteInicio[], avisos) };
}

/** Actividad o Agenda del hilo. Nunca rechaza: sin red queda en error, con «Reintentar». */
export async function cargarFilasHilo(
  ejecutar: EjecutarHilo,
  segmento: "actividad" | "agenda",
  ahora: Date,
): Promise<ListaHilo<FilaHilo>> {
  const esActividad = segmento === "actividad";
  const r = await ejecutar(esActividad ? "core.actividad.list" : "core.actividades.tareas", {
    limite: esActividad ? 20 : 50,
  }).catch(() => null);
  if (!r) return ERROR;
  if (!r.ok) return { estado: estadoDeFallo(r.error.code), items: [] };
  if (esActividad) {
    const { items } = r.data as { items: Parameters<typeof actividadHilo>[0] };
    return { estado: "listo", items: actividadHilo(items, ahora) };
  }
  const { items } = r.data as { items: Parameters<typeof agendaHilo>[0] };
  return { estado: "listo", items: agendaHilo(items, ahora) };
}

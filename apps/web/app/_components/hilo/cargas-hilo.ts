import type { FilaHilo, ListaHilo, PendienteHilo } from "@opai/ds";
import type { Resultado } from "@opai/capabilities";

import {
  actividadHilo,
  agendaHilo,
  estadoDeFallo,
  type PendienteInicio,
  pendientesHilo,
} from "./datos-hilo";

/**
 * Lecturas del hilo. Quien las arma (el gancho `useHilo`) llama a `ejecutarCapacidad` con el id
 * literal de cada capacidad, como exige el gate de paridad pantalla ↔ MCP.
 */
export type LecturasHilo = Record<
  "pendientes" | "contadores" | "actividad" | "agenda",
  () => Promise<Resultado>
>;

const ERROR = { estado: "error", items: [] } as const;

/**
 * Pendientes del hilo: lo que espera una decisión más los avisos sin leer. Devuelve `null` si no se
 * pudo leer (falla o sin red): quien llama conserva lo que mostraba o pasa a error. Si solo fallan
 * los contadores, los pendientes se muestran igual, sin el aviso.
 */
export async function cargarPendientesHilo(
  leer: LecturasHilo,
): Promise<ListaHilo<PendienteHilo> | null> {
  const [p, c] = await Promise.all([
    leer.pendientes().catch(() => null),
    leer.contadores().catch(() => null),
  ]);
  if (!p?.ok) return null;
  const avisos = c?.ok
    ? ((c.data as { notificacionesNoLeidas: number | null }).notificacionesNoLeidas ?? 0)
    : 0;
  return { estado: "listo", items: pendientesHilo(p.data as PendienteInicio[], avisos) };
}

/** Actividad o Agenda del hilo. Nunca rechaza: sin red queda en error, con «Reintentar». */
export async function cargarFilasHilo(
  leer: LecturasHilo,
  segmento: "actividad" | "agenda",
  ahora: Date,
): Promise<ListaHilo<FilaHilo>> {
  const esActividad = segmento === "actividad";
  const r = await leer[segmento]().catch(() => null);
  if (!r) return ERROR;
  if (!r.ok) return { estado: estadoDeFallo(r.error.code), items: [] };
  if (esActividad) {
    const { items } = r.data as { items: Parameters<typeof actividadHilo>[0] };
    return { estado: "listo", items: actividadHilo(items, ahora) };
  }
  const { items } = r.data as { items: Parameters<typeof agendaHilo>[0] };
  return { estado: "listo", items: agendaHilo(items, ahora) };
}

/**
 * Un refresco que falla (sin red o error) no borra la lista que ya se veía (CAR-317). Si dice que ya no
 * hay permiso, se muestra eso.
 */
export const conservarSiFalla = <T>(previo: ListaHilo<T>, nuevo: ListaHilo<T>): ListaHilo<T> =>
  nuevo.estado === "error" && previo.estado === "listo" ? previo : nuevo;

type Segmento = "pendientes" | "actividad" | "agenda";
type Filas = ListaHilo<FilaHilo>;

/**
 * Abrir Actividad o Agenda las vuelve a pedir (una consulta por clic, nunca por navegación, ADR-045),
 * para que una tarea hecha en otra pantalla se vea al volver. Solo cuenta la respuesta del último
 * pedido de cada segmento: una que llega tarde no pisa a la más nueva.
 */
export function refrescoDeSegmentos(
  cargar: (s: "actividad" | "agenda") => Promise<Filas>,
  aplicar: (s: "actividad" | "agenda", actualizar: (previa: Filas) => Filas) => void,
): (s: Segmento) => void {
  const turno = { actividad: 0, agenda: 0 };
  return (s) => {
    if (s === "pendientes") return;
    const n = ++turno[s];
    void cargar(s).then((nueva) => {
      if (n === turno[s]) aplicar(s, (previa) => conservarSiFalla(previa, nueva));
    });
  };
}

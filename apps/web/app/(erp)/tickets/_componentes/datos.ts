import type { BadgeProps } from "@opai/ds";

import { ejecutarComoUsuario } from "@/lib/servidor";
import type { Parametros, SearchParams } from "@/lib/parametros";

export type Ticket = {
  id: string;
  tipoId: string;
  tipoNombre: string;
  tipoRequiereAprobacion: boolean;
  titulo: string;
  descripcion: string;
  prioridad: string;
  estado: string;
  solicitanteId: string;
  responsableId: string;
  motivoRechazo: string | null;
  slaVenceEn: string | null;
  resueltoEn: string | null;
  cerradoEn: string | null;
  createdAt: string;
};

export type EventoTicket = {
  id: string;
  tipo: string;
  actorId: string;
  comentario: string | null;
  estadoDesde: string | null;
  estadoHasta: string | null;
  createdAt: string;
};

/** Estados ADR-025, con su tono de badge en pantalla. */
export const TONO_ESTADO: Record<string, NonNullable<BadgeProps["tono"]>> = {
  abierto: "info",
  en_curso: "warning",
  resuelto: "success",
  cerrado: "neutro",
  rechazado: "danger",
};

export const ETIQUETA_ESTADO: Record<string, string> = {
  abierto: "Abierto",
  en_curso: "En curso",
  resuelto: "Resuelto",
  cerrado: "Cerrado",
  rechazado: "Rechazado",
};

export const ETIQUETA_PRIORIDAD: Record<string, string> = {
  p1: "P1 · Urgente",
  p2: "P2 · Alta",
  p3: "P3 · Media",
  p4: "P4 · Baja",
};

export const TONO_PRIORIDAD: Record<string, NonNullable<BadgeProps["tono"]>> = {
  p1: "danger",
  p2: "warning",
  p3: "info",
  p4: "neutro",
};

export async function filtrosDe(sp: SearchParams): Promise<Parametros> {
  const p = await sp;
  return Object.fromEntries(Object.entries(p).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]));
}

export async function cargarTickets(p: Parametros) {
  return ejecutarComoUsuario<{ items: Ticket[]; siguiente: string | null }>(
    "erp",
    "tickets.tickets.listar",
    {
      vista: p["vista"] ?? "mios",
      ...(p["estado"] ? { estado: p["estado"] } : {}),
    },
  );
}

export async function cargarTicket(id: string) {
  return ejecutarComoUsuario<{ ticket: Ticket; eventos: EventoTicket[] }>(
    "erp",
    "tickets.tickets.obtener",
    { id },
  );
}

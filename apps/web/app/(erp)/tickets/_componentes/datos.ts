import type { BadgeProps } from "@opai/ds";

import { ejecutarComoUsuario } from "@/lib/servidor";
import { estadoPantalla } from "@/lib/formato";
import type { Parametros } from "@/lib/parametros";

export const POR_PAGINA = 50;

export type Ticket = {
  id: string;
  numero: string;
  tipoId: string;
  tipoNombre: string;
  tipoRequiereAprobacion: boolean;
  titulo: string;
  descripcion: string;
  prioridad: string;
  estado: string;
  solicitanteId: string;
  responsableId: string;
  instalacionId: string | null;
  motivoRechazo: string | null;
  slaVenceEn: string | null;
  resueltoEn: string | null;
  cerradoEn: string | null;
  createdAt: string;
};

export type TipoTicket = {
  id: string;
  nombre: string;
  descripcion: string | null;
  responsableDefectoTipo: "rol" | "usuario";
  responsableDefectoRol: string | null;
  responsableDefectoUsuarioId: string | null;
  requiereAprobacion: boolean;
  aprobadorRol: string | null;
  slaHoras: number | null;
  rolesPermitidos: string[];
  activo: boolean;
  orden: number;
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

export async function cargarTickets(p: Parametros) {
  const q = p["q"]?.trim().slice(0, 80);
  const r = await ejecutarComoUsuario<{ items: Ticket[]; siguiente: string | null }>(
    "erp",
    "tickets.tickets.listar",
    {
      vista: p["vista"] ?? "mios",
      limite: POR_PAGINA,
      ...(p["estado"] ? { estado: p["estado"] } : {}),
      ...(q && q.length >= 2 ? { q } : {}),
      ...(p["cursor"] ? { cursor: p["cursor"] } : {}),
    },
  );
  return {
    state: estadoPantalla(r),
    items: r.ok ? r.data.items : [],
    siguiente: r.ok ? r.data.siguiente : null,
    error: r,
  };
}

export type RespuestaTicketsLista = Awaited<ReturnType<typeof cargarTickets>>;

export async function cargarTicket(id: string) {
  return ejecutarComoUsuario<{ ticket: Ticket; eventos: EventoTicket[] }>(
    "erp",
    "tickets.tickets.obtener",
    { id },
  );
}

export async function cargarTipos() {
  const r = await ejecutarComoUsuario<{ items: TipoTicket[] }>("erp", "tickets.tipos.listar", { limite: 200 });
  return r.ok ? { ...r, data: r.data.items } : r;
}

export type InstalacionOpcion = { id: string; nombre: string };

/**
 * Instalaciones activas que quien crea puede elegir (su alcance, ADR-022). Quien no tiene permiso de
 * ver instalaciones recibe una lista vacía y el campo no aparece.
 */
export async function cargarInstalaciones(): Promise<InstalacionOpcion[]> {
  const r = await ejecutarComoUsuario<{ items: InstalacionOpcion[] }>(
    "erp",
    "core.instalaciones.list",
    {
      estado: "activa",
      limite: 100,
    },
  );
  return r.ok ? r.data.items.map((i) => ({ id: i.id, nombre: i.nombre })) : [];
}

/** Nombre de la instalación del ticket, solo si quien mira la tiene en su alcance. */
export async function nombreInstalacion(id: string | null): Promise<string | null> {
  if (!id) return null;
  const r = await ejecutarComoUsuario<{ nombre: string }>("erp", "core.instalaciones.get", { id });
  return r.ok ? r.data.nombre : null;
}

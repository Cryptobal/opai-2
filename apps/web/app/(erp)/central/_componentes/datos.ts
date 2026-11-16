import type { Parametros } from "@/lib/parametros";
import { puedeDeIdentidad } from "@/lib/permisos-ui";
import { ejecutarComoUsuario, identidadActual } from "@/lib/servidor";

export type {
  Alerta,
  EventoAlerta,
  IntentoContacto,
  PropuestaAgente,
  TurnoEstado,
  EstadoCentral,
} from "./tipos-central";
export {
  SEVERIDADES,
  ETIQUETA_SEVERIDAD,
  TONO_SEVERIDAD,
  ETIQUETA_ESTADO,
  TONO_ESTADO,
  VISTAS,
  ordenarCola,
} from "./tipos-central";

import type { Alerta, EventoAlerta, IntentoContacto, PropuestaAgente, TurnoEstado, EstadoCentral } from "./tipos-central";
import { SEVERIDADES, VISTAS } from "./tipos-central";

export function cargarCola(p: Parametros) {
  const vista = VISTAS.some((v) => v.valor === p["vista"]) ? p["vista"] : "activas";
  const severidad = SEVERIDADES.includes(p["severidad"] as (typeof SEVERIDADES)[number]) ? p["severidad"] : undefined;
  return ejecutarComoUsuario<{ items: Alerta[]; siguiente: string | null }>("erp", "central.alertas.listar", {
    vista,
    limite: 100,
    ...(severidad ? { severidad } : {}),
    ...(p["cursor"] ? { cursor: p["cursor"] } : {}),
  });
}

export function cargarEstado() {
  return ejecutarComoUsuario<EstadoCentral>("erp", "central.estado", {});
}

export function cargarAlerta(id: string) {
  return ejecutarComoUsuario<{
    alerta: Alerta & { personaNombre: string | null };
    eventos: EventoAlerta[];
    intentos: IntentoContacto[];
  }>("erp", "central.alertas.obtener", { id });
}

export async function cargarPropuestasAlerta(alertaId: string) {
  const r = await ejecutarComoUsuario<{ items: PropuestaAgente[] }>("erp", "central.propuestas.listar", {
    estado: "pendiente",
    limite: 50,
  });
  if (!r.ok) return r;
  return { ok: true as const, data: { items: r.data.items.filter((p) => p.alertaId === alertaId) } };
}

export function cargarTurnoEstado() {
  return ejecutarComoUsuario<TurnoEstado>("erp", "central.turno.estado", {});
}

export async function puedeAtender(): Promise<boolean> {
  const identidad = await identidadActual();
  return identidad ? puedeDeIdentidad(identidad)("central:alertas.atender") : false;
}
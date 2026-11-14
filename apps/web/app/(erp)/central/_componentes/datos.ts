import type { BadgeProps } from "@opai/ds";

import type { Parametros } from "@/lib/parametros";
import { ejecutarComoUsuario } from "@/lib/servidor";

type Tono = NonNullable<BadgeProps["tono"]>;

export type Alerta = {
  id: string;
  instalacionId: string;
  instalacionNombre: string | null;
  personaId: string | null;
  titulo: string;
  descripcion: string;
  severidad: string;
  origen: string;
  pasoActual: number;
  atencionPorId: string | null;
  estado: string;
  pospuestaHasta: string | null;
  notaCierre: string | null;
  cerradaEn: string | null;
  createdAt: string;
};

export type EventoAlerta = {
  id: string;
  tipo: string;
  actorTipo: "persona" | "agente" | "sistema";
  nota: string | null;
  estadoDesde: string | null;
  estadoHacia: string;
  createdAt: string;
};

export type EstadoCentral = {
  activas: Record<string, number>;
  pospuestas: number;
  instalaciones: { instalacionId: string; instalacionNombre: string | null; activas: number; peor: string }[];
};

export const SEVERIDADES = ["critica", "alta", "media", "baja"] as const;
export const ETIQUETA_SEVERIDAD: Record<string, string> = { critica: "Crítica", alta: "Alta", media: "Media", baja: "Baja" };
export const TONO_SEVERIDAD: Record<string, Tono> = { critica: "danger", alta: "warning", media: "info", baja: "neutro" };

export const ETIQUETA_ESTADO: Record<string, string> = {
  nueva: "Nueva",
  en_contacto: "En contacto",
  escalada: "Escalada",
  en_atencion: "En atención",
  pospuesta: "Pospuesta",
  resuelta: "Resuelta",
  falsa_alarma: "Falsa alarma",
};
export const TONO_ESTADO: Record<string, Tono> = {
  nueva: "danger",
  en_contacto: "warning",
  escalada: "warning",
  en_atencion: "info",
  pospuesta: "neutro",
  resuelta: "success",
  falsa_alarma: "neutro",
};

export const VISTAS = [
  { valor: "activas", etiqueta: "Activas" },
  { valor: "pospuestas", etiqueta: "Pospuestas" },
  { valor: "cerradas", etiqueta: "Cerradas" },
  { valor: "todas", etiqueta: "Todas" },
] as const;

const peso = (s: string) => {
  const i = SEVERIDADES.indexOf(s as (typeof SEVERIDADES)[number]);
  return i < 0 ? SEVERIDADES.length : i;
};

/**
 * Cola agrupada por instalación (spec §3): primero la instalación con la alerta más grave; dentro,
 * de la más grave a la menos grave y de la más antigua a la más nueva (la que más espera, arriba).
 */
export function ordenarCola(items: readonly Alerta[]): Alerta[] {
  const peor = new Map<string, number>();
  for (const a of items) peor.set(a.instalacionId, Math.min(peor.get(a.instalacionId) ?? 99, peso(a.severidad)));
  const nombre = (a: Alerta) => a.instalacionNombre ?? "";
  return [...items].sort(
    (a, b) =>
      (peor.get(a.instalacionId) ?? 99) - (peor.get(b.instalacionId) ?? 99) ||
      nombre(a).localeCompare(nombre(b), "es") ||
      a.instalacionId.localeCompare(b.instalacionId) ||
      peso(a.severidad) - peso(b.severidad) ||
      String(a.createdAt).localeCompare(String(b.createdAt)),
  );
}

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
  return ejecutarComoUsuario<{ alerta: Alerta & { personaNombre: string | null }; eventos: EventoAlerta[] }>(
    "erp",
    "central.alertas.obtener",
    { id },
  );
}

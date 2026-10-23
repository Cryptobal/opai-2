import { hoyIso } from "@/lib/fechas";
import type { Parametros } from "@/lib/parametros";
import { ejecutarComoUsuario } from "@/lib/servidor";

export type Evento = {
  id: string;
  cuando: string;
  capability: string;
  actor: { tipo: string; nombre: string; agente: boolean };
  via: string | null;
  accion: string;
  cambios: { campo: string; valor: string }[];
  detalle: unknown;
  entidad: { tipo: string; id: string } | null;
  extra: unknown;
};

export const CAPACIDADES = [
  ["core.cuentas", "Cuentas"],
  ["core.contactos", "Contactos"],
  ["core.instalaciones", "Instalaciones"],
  ["core.puestos", "Puestos"],
  ["core.personas", "Personas"],
  ["core.vinculos", "Vínculos"],
  ["core.estructuras", "Sueldos"],
  ["core.documentos", "Documentos"],
  ["core.users", "Usuarios"],
  ["core.apikeys", "API keys"],
  ["core.aprobaciones", "Aprobaciones"],
  ["core.integraciones", "Integraciones"],
  ["core.config", "Ajustes"],
].map(([valor, etiqueta]) => ({ valor: valor ?? "", etiqueta: etiqueta ?? "" }));

export const RANGOS = [
  { valor: "7", etiqueta: "Últimos 7 días" },
  { valor: "30", etiqueta: "Últimos 30 días" },
  { valor: "90", etiqueta: "Últimos 90 días" },
];

/** Día ISO de hace `n` días (UTC). */
const haceDiasIso = (n: number) =>
  new Date(Date.parse(`${hoyIso()}T00:00:00Z`) - n * 86_400_000).toISOString().slice(0, 10);

/** Escrituras auditadas con los filtros de la URL (capacidad, actor, rango) y paginación por cursor. */
export async function cargarAuditoria(p: Parametros) {
  const actor = p["actor"] === "persona" || p["actor"] === "agente" ? p["actor"] : undefined;
  const rango = RANGOS.find((r) => r.valor === p["rango"]);
  return ejecutarComoUsuario<{ items: Evento[]; siguiente: string | null }>(
    "erp",
    "core.actividad.list",
    {
      limite: 50,
      ...(actor ? { actor } : {}),
      ...(p["capacidad"] ? { capability: p["capacidad"] } : {}),
      ...(rango ? { desde: haceDiasIso(Number(rango.valor)) } : {}),
      ...(p["cursor"] ? { cursor: p["cursor"] } : {}),
    },
  );
}

/** Query string con cambios (null borra la clave). */
export function con(p: Parametros, cambios: Record<string, string | null>) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...p, ...cambios })) if (v) q.set(k, v);
  const s = q.toString();
  return s ? `?${s}` : "?";
}

const RUTA: Record<string, string> = {
  cuenta: "/cuentas",
  instalacion: "/instalaciones",
  persona: "/personas",
  cargo: "/cargos",
};
/** Ruta de la ficha de una entidad auditada (si tiene ficha). */
export const rutaEntidad = (e: Evento["entidad"]) =>
  e && RUTA[e.tipo] ? `${RUTA[e.tipo]}/${e.id}` : null;

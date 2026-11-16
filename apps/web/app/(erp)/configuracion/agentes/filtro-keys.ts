import type { Parametros } from "@/lib/parametros";

import type { ApiKey } from "./datos";

export type FiltroKeyEstado = "activas" | "revocadas" | "todas";

export const FILTROS_KEY: { id: FiltroKeyEstado; etiquetaBase: string }[] = [
  { id: "activas", etiquetaBase: "Activas" },
  { id: "revocadas", etiquetaBase: "Revocadas e inválidas" },
  { id: "todas", etiquetaBase: "Todas" },
];

export function filtroDesde(p?: Parametros): FiltroKeyEstado {
  const e = p?.estado;
  if (e === "revocadas" || e === "todas") return e;
  return "activas";
}

export function conteosKeys(keys: ApiKey[]) {
  const activas = keys.filter((k) => k.valida).length;
  const revocadas = keys.length - activas;
  return { activas, revocadas, todas: keys.length };
}

export function keysFiltradas(keys: ApiKey[], filtro: FiltroKeyEstado) {
  if (filtro === "todas") return keys;
  if (filtro === "revocadas") return keys.filter((k) => !k.valida);
  return keys.filter((k) => k.valida);
}

/** URL de la lista conservando `crear` y el filtro de estado. */
export function hrefFiltroKeys(filtro: FiltroKeyEstado, p?: Parametros) {
  const qs = new URLSearchParams();
  if (filtro !== "activas") qs.set("estado", filtro);
  if (p?.crear) qs.set("crear", p.crear);
  const t = qs.toString();
  return t ? `/configuracion/agentes?${t}` : "/configuracion/agentes";
}

export const textosVacioKey: Record<
  FiltroKeyEstado,
  { titulo: string; descripcion: string }
> = {
  activas: {
    titulo: "Aún no hay keys activas",
    descripcion: "Crea una para que tu asistente opere OPAI con tus permisos.",
  },
  revocadas: {
    titulo: "Sin keys revocadas ni inválidas",
    descripcion: "Aquí verás las keys que revocaste o que ya no son válidas.",
  },
  todas: {
    titulo: "Aún no hay keys",
    descripcion: "Crea una para que tu asistente opere OPAI con tus permisos.",
  },
};
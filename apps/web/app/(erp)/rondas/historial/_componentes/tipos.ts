export const RUTA_HISTORIAL = "/rondas/historial";

export const ESTADOS = [
  { id: "todas", etiqueta: "Todas" },
  { id: "completada", etiqueta: "Completas" },
  { id: "incompleta", etiqueta: "Incompletas" },
  { id: "atrasada", etiqueta: "Atrasadas" },
  { id: "en_curso", etiqueta: "En curso" },
  { id: "no_realizada", etiqueta: "No realizadas" },
] as const;

export type EstadoFiltro = (typeof ESTADOS)[number]["id"];

export type EjecucionResumen = {
  id: string;
  instalacionId: string;
  plantillaId: string;
  plantillaNombre: string;
  adhoc: boolean;
  estado: string;
  horaInicio: string | null;
  horaCierre: string | null;
  puntosMarcados: number;
  puntosObligatorios: number;
  anomalias: number;
};

export type MarcaDetalle = {
  id: string;
  puntoId: string;
  puntoNombre: string;
  hora: string;
  geocerca: string;
  anomalias: string[];
};

export type EjecucionDetalle = EjecucionResumen & {
  marcas: MarcaDetalle[];
  motivoCierre: string | null;
};

export function hrefHistorial(q: {
  estado?: EstadoFiltro;
  inst?: string;
  ver?: string;
  desde?: string;
  hasta?: string;
}): string {
  const p = new URLSearchParams();
  if (q.estado && q.estado !== "todas") p.set("estado", q.estado);
  if (q.inst) p.set("inst", q.inst);
  if (q.ver) p.set("ver", q.ver);
  if (q.desde) p.set("desde", q.desde);
  if (q.hasta) p.set("hasta", q.hasta);
  const s = p.toString();
  return s ? `${RUTA_HISTORIAL}?${s}` : RUTA_HISTORIAL;
}

const ETIQUETA_ESTADO: Record<string, string> = {
  completada: "Completa",
  incompleta: "Incompleta",
  atrasada: "Atrasada",
  en_curso: "En curso",
  no_realizada: "No realizada",
  cerrada_auto: "Cerrada automática",
  cerrada_admin: "Cierre admin",
};

export function etiquetaEstado(estado: string): string {
  return ETIQUETA_ESTADO[estado] ?? estado;
}

export function tonoEstado(estado: string): "success" | "danger" | "warning" | "info" | "neutro" {
  if (estado === "completada" || estado === "cerrada_auto" || estado === "cerrada_admin") return "success";
  if (estado === "incompleta" || estado === "no_realizada") return "danger";
  if (estado === "atrasada") return "warning";
  if (estado === "en_curso") return "info";
  return "neutro";
}
import type { Portal } from "../types";

/** Algo que espera una respuesta de la persona (segmento «Pendientes» del hilo). */
export type PendienteHilo = {
  id: string;
  /** De dónde viene: el área o «Agentes». */
  origen: string;
  /** Área a la que pertenece, junto al origen («Operaciones»). */
  area?: string;
  /** Lo propuso un agente: es lo único que el marco pinta en índigo (ADR-090). */
  agente?: boolean;
  titulo: string;
  contexto?: string;
  href: string;
  /** Texto del botón: «Revisar», «Pedir renovación»… */
  accion: string;
};

/** Fila de «Actividad» (lo que ya pasó) o de «Agenda» (lo que viene). */
export type FilaHilo = {
  id: string;
  /** Hora o fecha corta, ya formateada. */
  cuando: string;
  quien?: string;
  agente?: boolean;
  texto: string;
  nota?: string;
  tono?: "ok" | "aviso" | "alerta";
  href?: string;
};

export type EstadoLista = "cargando" | "listo" | "error" | "sin-permiso";
export type ListaHilo<T> = { estado: EstadoLista; items: readonly T[] };
export type SegmentoHilo = "pendientes" | "actividad" | "agenda";
export type PanelHilo = "indice" | "portales";

/** Un área del Índice con sus pantallas, ya filtradas por permiso y módulo activo. */
export type AreaIndice = {
  id: string;
  nombre: string;
  entradas: readonly { href: string; etiqueta: string }[];
};

/** Portal en el panel «Portales», con la línea que dice para quién es. */
export type PortalHilo = Portal & { descripcion?: string };

"use client";

import { useSyncExternalStore } from "react";

import type { Contexto } from "./tipos";

/** Pedido de abrir el panel del agente desde fuera de él (historial, ⌘K, menú de una ficha, URL). */
export type SolicitudAgente = {
  /** Retoma esta conversación guardada. */
  conversacionId?: string;
  /** Empieza una conversación sobre esta ficha; el servidor revalida que la persona la vea. */
  contexto?: Contexto;
  /** Texto que se deja escrito en el compositor (⌘K), sin enviarlo. */
  borrador?: string;
  /** Nombre de la ficha, solo para mostrarlo en el panel. */
  etiqueta?: string;
};

export const EVENTO_AGENTE = "opai:agente";

/** Abre el panel del agente; sin agente disponible en el shell no hay quien escuche y no pasa nada. */
export function abrirAgente(solicitud: SolicitudAgente = {}): void {
  window.dispatchEvent(new CustomEvent<SolicitudAgente>(EVENTO_AGENTE, { detail: solicitud }));
}

let escuchas = 0;
const suscritos = new Set<() => void>();
const avisar = () => suscritos.forEach((f) => f());

/** El shell la llama mientras el agente está disponible (panel montado y escuchando); devuelve cómo dejar de estarlo. */
export function registrarAgente(): () => void {
  escuchas += 1;
  avisar();
  return () => {
    escuchas -= 1;
    avisar();
  };
}

/** Verdadero si hay un agente que atienda un pedido: así una ficha ofrece «Preguntar a OPAI» solo cuando existe. */
export function useAgenteListo(): boolean {
  return useSyncExternalStore(
    (f) => {
      suscritos.add(f);
      return () => void suscritos.delete(f);
    },
    () => escuchas > 0,
    () => false,
  );
}

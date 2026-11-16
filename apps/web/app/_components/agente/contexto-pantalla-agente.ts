"use client";

import { useEffect } from "react";

import type { SolicitudAgente } from "./abrir-agente";
import type { Contexto } from "./tipos";

export type FichaActual = { contexto: Contexto; etiqueta: string };

let fichaActual: FichaActual | null = null;
const oyentes = new Set<() => void>();
const avisar = () => oyentes.forEach((f) => f());

/** Contexto de la ficha visible; lo usa el shell al abrir el panel (⌘J, botón IA). */
export function useFichaActual(ficha: FichaActual | null): void {
  useEffect(() => {
    fichaActual = ficha;
    avisar();
    return () => {
      if (
        ficha &&
        fichaActual?.contexto.id === ficha.contexto.id &&
        fichaActual?.contexto.tipo === ficha.contexto.tipo
      ) {
        fichaActual = null;
        avisar();
      }
    };
  }, [ficha]);
}

export function suscribirFichaActual(cb: () => void): () => void {
  oyentes.add(cb);
  return () => oyentes.delete(cb);
}

/** Lo que el panel debe recibir al abrirse sin un pedido explícito (p. ej. botón de la barra). */
export function solicitudDesdePantalla(): SolicitudAgente {
  if (!fichaActual) return {};
  return { contexto: fichaActual.contexto, etiqueta: fichaActual.etiqueta };
}

/** Solo pruebas unitarias: simula el registro que hace `useFichaActual`. */
export function fijarFichaPrueba(ficha: FichaActual | null): void {
  fichaActual = ficha;
  avisar();
}
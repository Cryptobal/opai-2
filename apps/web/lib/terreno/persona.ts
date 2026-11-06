"use client";

import { useSyncExternalStore } from "react";

/** Persona que eligió su nombre en «¿Quién eres?»: declarada en este teléfono, no autenticada (CAR-78 · B3). */
export type PersonaElegida = { id: string; nombre: string };

const CLAVE = "opai.terreno.persona";
const oyentes = new Set<() => void>();

const suscribir = (f: () => void) => {
  oyentes.add(f);
  window.addEventListener("storage", f);
  return () => {
    oyentes.delete(f);
    window.removeEventListener("storage", f);
  };
};
const leer = () => localStorage.getItem(CLAVE);

export function elegirPersona(p: PersonaElegida | null) {
  if (p) localStorage.setItem(CLAVE, JSON.stringify(p));
  else localStorage.removeItem(CLAVE);
  oyentes.forEach((f) => f());
}

/** `undefined` mientras se hidrata (sin parpadeo del selector), luego la elegida o `null`. */
export function usePersonaElegida(): PersonaElegida | null | undefined {
  const crudo = useSyncExternalStore(suscribir, leer, () => undefined);
  if (crudo === undefined) return undefined;
  if (crudo === null) return null;
  try {
    return JSON.parse(crudo) as PersonaElegida;
  } catch {
    return null;
  }
}

import { limpiarBuscadores } from "./core/maestros/buscadores";
import type { Capacidad } from "./types";

const registro = new Map<string, Capacidad>();

/** Registra capacidades. Un id duplicado es un error de programación y detiene el arranque. */
export function registrarCapacidades(capacidades: readonly Capacidad[]): void {
  for (const capacidad of capacidades) {
    if (registro.has(capacidad.id)) {
      throw new Error(`Capacidad duplicada: "${capacidad.id}".`);
    }
    registro.set(capacidad.id, capacidad);
  }
}

export function obtenerCapacidad(id: string): Capacidad | undefined {
  return registro.get(id);
}

export function listarCapacidades(): readonly Capacidad[] {
  return [...registro.values()];
}

/** Solo para tests. */
export function limpiarRegistro(): void {
  registro.clear();
  limpiarBuscadores();
}

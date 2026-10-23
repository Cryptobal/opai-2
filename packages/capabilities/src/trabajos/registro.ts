import type { z } from "zod";

import type { Contexto } from "../types";

export type DefinicionTrabajo<P> = {
  tipo: string;
  descripcion: string;
  payload: z.ZodType<P>;
  /** "diaria": el programador lo encola una vez al día por tenant. */
  periodicidad?: "diaria";
  handler(ctx: Contexto, payload: P): Promise<unknown>;
};

/** Trabajo registrado: el payload se valida con su esquema antes de ejecutar. */
export type Trabajo = {
  tipo: string;
  descripcion: string;
  periodicidad?: "diaria";
  ejecutar(ctx: Contexto, payload: unknown): Promise<unknown>;
};

/**
 * Declara un trabajo encolable (ADR-029). Ningún cron hace trabajo directo: encola trabajos que el
 * runner ejecuta con reintentos.
 */
export function defineTrabajo<P>(def: DefinicionTrabajo<P>): Trabajo {
  if (!/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/.test(def.tipo)) {
    throw new Error(`Tipo de trabajo inválido "${def.tipo}": usa <modulo>.<entidad>.<accion>.`);
  }
  return {
    tipo: def.tipo,
    descripcion: def.descripcion,
    ...(def.periodicidad ? { periodicidad: def.periodicidad } : {}),
    ejecutar: (ctx, payload) => def.handler(ctx, def.payload.parse(payload ?? {})),
  };
}

const registro = new Map<string, Trabajo>();

export function registrarTrabajos(trabajos: readonly Trabajo[]): void {
  for (const t of trabajos) {
    if (registro.has(t.tipo)) throw new Error(`Trabajo duplicado: "${t.tipo}".`);
    registro.set(t.tipo, t);
  }
}

export const obtenerTrabajo = (tipo: string) => registro.get(tipo);
export const listarTrabajos = (): readonly Trabajo[] => [...registro.values()];

export function limpiarTrabajos(): void {
  registro.clear();
}

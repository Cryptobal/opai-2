import { z } from "zod";

import type { Contexto } from "../../types";

/** Una fila de la búsqueda global. `href` es la ruta del ERP para abrirla. */
export const resultadoBusquedaSchema = z.object({
  id: z.string(),
  titulo: z.string(),
  detalle: z.string().nullable(),
  href: z.string().describe("Ruta del ERP para abrir el resultado."),
});
export type ResultadoBusqueda = z.infer<typeof resultadoBusquedaSchema>;

/**
 * Lo que un módulo aporta a la búsqueda global (⌘K y `core.buscar`; CAR-301). El núcleo solo lo
 * ejecuta si el actor tiene `permiso`, y el aporte aplica el alcance de filas en su propia consulta.
 */
export type Buscador = {
  /** Módulo dueño del aporte: solo se ejecuta si está activo para el tenant y en el scope de la key. */
  modulo: string;
  /** Clave estable del grupo (`negocios`, `cotizaciones`…). */
  grupo: string;
  /** Título del grupo en la paleta. */
  titulo: string;
  /** Permiso que da acceso a lo que aporta. */
  permiso: string;
  buscar: (ctx: Contexto, q: string) => Promise<ResultadoBusqueda[]>;
};

const registro = new Map<string, Buscador>();

/** Registra buscadores. Un grupo duplicado es un error de programación y detiene el arranque. */
export function registrarBuscadores(buscadores: readonly Buscador[]): void {
  for (const b of buscadores) {
    if (registro.has(b.grupo)) throw new Error(`Buscador duplicado: "${b.grupo}".`);
    registro.set(b.grupo, b);
  }
}

export function listarBuscadores(): readonly Buscador[] {
  return [...registro.values()];
}

/** Solo para tests y recargas: vacía los buscadores registrados. */
export function limpiarBuscadores(): void {
  registro.clear();
}

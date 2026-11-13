import { z } from "zod";

import { enScope } from "../autorizacion";
import type { Contexto } from "../types";

/** Una decisión que espera al actor en «Por aprobar». `href` abre la pantalla donde se resuelve. */
export const itemPorAprobarSchema = z.object({
  id: z.string(),
  resumen: z.string().describe("Texto de la decisión; puede incluir datos escritos por usuarios."),
  href: z.string().describe("Ruta del ERP donde se resuelve."),
  creadaEn: z.string(),
});
export type ItemPorAprobar = z.infer<typeof itemPorAprobarSchema>;

/**
 * Lo que un módulo aporta a la bandeja única «Por aprobar» (CAR-253, decisión de Carlos del 12-nov-2026,
 * opción A). Cada módulo conserva su flujo y su forma de decidir quién aprueba: la fuente solo cuenta y
 * lista lo que espera al actor, aplicando ese mismo criterio y el alcance en su propia consulta. El núcleo
 * la ejecuta si el módulo está activo, en el scope de la key y el actor tiene alguno de `permisos`.
 */
export type FuenteAprobaciones = {
  modulo: string;
  /** Clave estable del grupo (`cpq`, `rendiciones`, `tickets`). */
  origen: string;
  /** Título del grupo en la bandeja. */
  titulo: string;
  /** Basta uno de estos permisos para consultar la fuente. */
  permisos: readonly string[];
  contar: (ctx: Contexto) => Promise<number>;
  listar: (ctx: Contexto, limite: number) => Promise<ItemPorAprobar[]>;
};

const registro = new Map<string, FuenteAprobaciones>();

/** Registra fuentes. Un origen duplicado es un error de programación y detiene el arranque. */
export function registrarFuentesAprobaciones(fuentes: readonly FuenteAprobaciones[]): void {
  for (const f of fuentes) {
    if (registro.has(f.origen)) throw new Error(`Fuente de aprobaciones duplicada: "${f.origen}".`);
    registro.set(f.origen, f);
  }
}

/** Fuentes que el actor puede consultar: módulo activo, en el scope de la key y con permiso. */
export function fuentesDelActor(ctx: Contexto): FuenteAprobaciones[] {
  return [...registro.values()].filter(
    (f) =>
      ctx.modulosActivos.includes(f.modulo) &&
      enScope(ctx, f.modulo) &&
      f.permisos.some((p) => ctx.autorizar(p)),
  );
}

/** Solo para tests y recargas. */
export function limpiarFuentesAprobaciones(): void {
  registro.clear();
}

import type { HechoDeclarado, Ocurrencia, RangoPeriodo } from "@opai/domain";

import type { Contexto } from "./types";

/**
 * Hechos que un módulo ofrece para armar indicadores propios (CAR-313, ADR-094 §8). El módulo dice
 * qué ocurrió, a quién se atribuye y qué se puede sumar o filtrar; la empresa combina hechos en su
 * indicador. Lo que un módulo no declara aquí no se puede usar.
 */
export type HechoGestion = HechoDeclarado & {
  nombre: string;
  descripcion: string;
  /** Permiso del módulo dueño: quien no puede leer esos datos tampoco puede armar un indicador con ellos. */
  permiso: string;
  /** Ocurrencias con fecha dentro del rango, leídas con `ctx.db` (RLS del tenant). Solo lectura. */
  listar(ctx: Contexto, rango: Pick<RangoPeriodo, "desde" | "hasta">): Promise<readonly Ocurrencia[]>;
};

const ID_HECHO = /^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$/;

/** Módulo dueño de un hecho: el primer segmento de su id. */
export const moduloDeHecho = (id: string): string => id.split(".")[0] ?? "";

/** Declara un hecho validando su forma. */
export function defineHecho(hecho: HechoGestion): HechoGestion {
  const modulo = moduloDeHecho(hecho.id);
  if (!ID_HECHO.test(hecho.id)) throw new Error(`Id de hecho inválido: "${hecho.id}".`);
  if (hecho.nombre.trim().length < 3 || hecho.descripcion.trim().length < 20) {
    throw new Error(`El hecho "${hecho.id}" necesita nombre y una descripción de qué registra.`);
  }
  if (hecho.sujeto !== "usuario" && hecho.sujeto !== "persona") {
    throw new Error(`Sujeto inválido en el hecho "${hecho.id}".`);
  }
  if (!hecho.permiso.startsWith(`${modulo}:`)) {
    throw new Error(`El hecho "${hecho.id}" debe exigir un permiso de su propio módulo.`);
  }
  return hecho;
}

/** Valida los hechos de un manifiesto: del módulo, sin repetir y con permisos declarados por él. */
export function validarHechosDelModulo(
  modulo: string,
  hechos: readonly HechoGestion[],
  permisos: readonly string[],
): void {
  const vistos = new Set<string>();
  for (const hecho of hechos) {
    if (moduloDeHecho(hecho.id) !== modulo) {
      throw new Error(`El hecho "${hecho.id}" debe empezar con "${modulo}.".`);
    }
    if (vistos.has(hecho.id)) throw new Error(`Hecho duplicado: "${hecho.id}".`);
    vistos.add(hecho.id);
    if (!permisos.includes(hecho.permiso)) {
      throw new Error(`El hecho "${hecho.id}" usa un permiso no declarado: "${hecho.permiso}".`);
    }
  }
}

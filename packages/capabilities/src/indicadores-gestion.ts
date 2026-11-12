import {
  erroresDefinicionIndicador,
  type DefinicionIndicador,
  type RangoPeriodo,
} from "@opai/domain";

import type { Contexto } from "./types";

/**
 * Indicadores de gestión que publica un módulo (ADR-094, CAR-305). El módulo declara la definición y
 * cómo se mide desde sus propios hechos; el núcleo arma el catálogo, valida permisos y expone la
 * medición por pantalla, API y MCP. Un módulo apagado no aporta indicadores.
 */

/** Valor de un sujeto en el período. `null` = sin hechos que medir, que no es lo mismo que cero. */
export type MedicionIndicador = { sujetoId: string; valor: number | null };

export type ConsultaIndicador = {
  /** Mes de la empresa como intervalo [desde, hasta). */
  rango: RangoPeriodo;
  /** Zona horaria de la empresa, ya resuelta por el núcleo. */
  zona: string;
  /** Instante de la medición: lo que aún no vence no cuenta en contra. */
  ahora: Date;
  /** Sujetos a medir. Ausente = todos los que tienen hechos en el período. */
  sujetos?: readonly string[];
};

export type IndicadorGestion = DefinicionIndicador & {
  /**
   * Permiso del módulo dueño de los hechos. Quien no puede leer esos hechos tampoco puede medirlos:
   * el catálogo no abre una puerta lateral a datos de otro módulo.
   */
  permiso: string;
  /** Mide con `ctx.db` (RLS del tenant). Devuelve una fila por sujeto, sin repetir. */
  medir(ctx: Contexto, consulta: ConsultaIndicador): Promise<readonly MedicionIndicador[]>;
};

/** Módulo dueño de un indicador: el primer segmento de su id. */
export const moduloDeIndicador = (id: string): string => id.split(".")[0] ?? "";

/** Declara un indicador validando su definición contra el módulo de su id. */
export function defineIndicador(indicador: IndicadorGestion): IndicadorGestion {
  const errores = erroresDefinicionIndicador(indicador, moduloDeIndicador(indicador.id));
  if (errores.length > 0) throw new Error(errores.join(" "));
  if (!indicador.permiso.startsWith(`${moduloDeIndicador(indicador.id)}:`)) {
    throw new Error(
      `El indicador "${indicador.id}" debe exigir un permiso de su propio módulo, no "${indicador.permiso}".`,
    );
  }
  return indicador;
}

/**
 * Valida los indicadores de un manifiesto: pertenecen al módulo, no se repiten y exigen un permiso
 * declarado por él. Lo llama `defineModule`; un error detiene el arranque, como con las capacidades.
 */
export function validarIndicadoresDelModulo(
  modulo: string,
  indicadores: readonly IndicadorGestion[],
  permisos: readonly string[],
): void {
  const vistos = new Set<string>();
  for (const indicador of indicadores) {
    const errores = erroresDefinicionIndicador(indicador, modulo);
    if (errores.length > 0) throw new Error(errores.join(" "));
    if (vistos.has(indicador.id)) throw new Error(`Indicador duplicado: "${indicador.id}".`);
    vistos.add(indicador.id);
    if (!permisos.includes(indicador.permiso)) {
      throw new Error(
        `El indicador "${indicador.id}" usa un permiso no declarado: "${indicador.permiso}".`,
      );
    }
  }
}

import { logroDeMeta, puntajeDe, rangoDelPeriodo } from "@opai/domain";

import type { Contexto } from "../types";
import type { VistaScorecard } from "./comun";
import { indicadoresPara } from "./propios-indicadores";

export type DetalleIndicador = {
  indicador: string;
  nombre: string;
  unidad: string | null;
  meta: number;
  peso: number;
  valor: number | null;
  logro: number | null;
  /** false = el indicador ya no existe o su módulo está apagado: no entra en el puntaje. */
  disponible: boolean;
};
export type ResultadoPersona = {
  puntaje: number | null;
  cobertura: number;
  indicadores: DetalleIndicador[];
};

/**
 * Contexto para medir un scorecard. El resultado de una persona no puede cambiar según quién lo
 * mira, así que los indicadores se miden sin los permisos ni el alcance de quien consulta: a quién
 * puede ver cada uno ya lo resolvió la capacidad antes de llegar aquí (jefatura, alcance y permisos
 * de Desempeño). Solo se usa para llamar a `medir`; nunca sale de este archivo.
 */
function contextoDeMedicion(ctx: Contexto): Contexto {
  return {
    ...ctx,
    alcance: null,
    scopes: null,
    autorizar: (permiso) => !permiso.startsWith("platform:"),
  };
}

/**
 * Resultado de cada persona con el scorecard dado, en un mes. Una medición por indicador para todo
 * el grupo. Los indicadores atribuidos al usuario se cruzan por la ficha vinculada (`usuarioId`): una
 * persona sin usuario vinculado queda sin dato en esos indicadores, no en cero.
 */
export async function resultadosDe(
  ctx: Contexto,
  scorecard: VistaScorecard,
  personas: readonly { id: string; usuarioId: string | null }[],
  periodo: string,
  zona: string,
): Promise<Map<string, ResultadoPersona>> {
  // Con los archivados: un indicador propio que estuvo en el scorecard de ese mes se sigue midiendo.
  const catalogo = await indicadoresPara(ctx, periodo, { conArchivados: true });
  const medicion = contextoDeMedicion(ctx);
  const rango = rangoDelPeriodo(periodo, zona);
  const ahora = new Date();
  const usuarios = personas.flatMap((p) => (p.usuarioId ? [p.usuarioId] : []));
  const ids = personas.map((p) => p.id);
  const valores = await Promise.all(
    scorecard.indicadores.map(async (item) => {
      const def = catalogo.get(item.indicador);
      const sujetos = def?.sujeto === "usuario" ? usuarios : ids;
      if (!def || sujetos.length === 0) return new Map<string, number | null>();
      const filas = await def.medir(medicion, { rango, zona, ahora, sujetos });
      return new Map(filas.map((f) => [f.sujetoId, f.valor]));
    }),
  );
  const salida = new Map<string, ResultadoPersona>();
  for (const persona of personas) {
    const indicadores = scorecard.indicadores.map((item, i): DetalleIndicador => {
      const def = catalogo.get(item.indicador);
      const sujeto = def?.sujeto === "usuario" ? persona.usuarioId : persona.id;
      const valor = def && sujeto ? (valores[i]?.get(sujeto) ?? null) : null;
      return {
        indicador: item.indicador,
        nombre: def?.nombre ?? item.indicador,
        unidad: def?.unidad ?? null,
        meta: item.meta,
        peso: item.peso,
        valor,
        logro: def ? logroDeMeta(valor, item.meta, def.sentido) : null,
        disponible: def !== undefined,
      };
    });
    salida.set(persona.id, { ...puntajeDe(indicadores), indicadores });
  }
  return salida;
}

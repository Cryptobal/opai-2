import type { Contexto } from "./tipos";

/**
 * Preguntas sugeridas del agente dentro de una ficha (ADR-109, CAR-335 D5). Son atajos: la persona
 * también puede escribir la suya. El agente responde con las capacidades que la persona ya puede usar.
 */
const PREGUNTAS: Record<Contexto["tipo"], readonly string[]> = {
  cuenta: ["Resume esta cuenta", "¿Qué tiene pendiente?", "¿Cuáles son sus negocios abiertos?"],
  instalacion: ["Resume esta instalación", "¿Qué tiene pendiente?", "¿Quién está asignado aquí?"],
  negocio: ["Resume este negocio", "¿Cuál es el próximo paso?", "¿Qué falta para cerrarlo?"],
  persona: ["Resume esta ficha", "¿Qué documentos le faltan?", "¿Dónde está asignada?"],
};

export function preguntasDeFicha(tipo: Contexto["tipo"]): readonly string[] {
  return PREGUNTAS[tipo];
}

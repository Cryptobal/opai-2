/**
 * Indicadores de Inicio que una empresa puede elegir (ADR-109, CAR-335 D3): los totales de la empresa
 * que entrega `core.inicio.indicadores`. Cada empresa elige cuáles se ven y en qué orden
 * (`core.inicio_indicadores`); sin elección se ven los de por defecto.
 */
export const INDICADORES_INICIO = ["cobertura", "negocios", "facturado", "tickets"] as const;

export type IndicadorInicio = (typeof INDICADORES_INICIO)[number];

export const INDICADORES_INICIO_DEFECTO: readonly IndicadorInicio[] = INDICADORES_INICIO;

/**
 * Orden final: lo elegido (o, si no hay elección, lo de por defecto) que además esté disponible para
 * quien mira. Ignora ids desconocidos y repetidos.
 */
export function ordenarIndicadores(
  elegidos: readonly string[],
  disponibles: readonly string[],
): string[] {
  const base = elegidos.length ? elegidos : INDICADORES_INICIO_DEFECTO;
  return [...new Set(base)].filter((id) => disponibles.includes(id));
}

// Contexto comercial de un negocio (CAR-138, PR 4). Puro: reglas de quién confirma y qué contexto puede
// alimentar un texto generado. Lo «inferido» nunca se presenta como hecho confirmado.

export const TIPOS_CONTEXTO = [
  "reunion",
  "llamada",
  "correo",
  "visita",
  "documento",
  "nota",
] as const;
export type TipoContexto = (typeof TIPOS_CONTEXTO)[number];

export const ESTADOS_CONTEXTO = ["confirmado", "inferido"] as const;
export type EstadoContexto = (typeof ESTADOS_CONTEXTO)[number];

export type EntradaContexto = {
  tipo: TipoContexto;
  resumen: string;
  fuente: string;
  /** `AAAA-MM-DD`. */
  fechaFuente: string;
  estado: EstadoContexto;
};

/** Una persona registra lo que sabe (confirmado o inferido); un agente o el sistema solo infieren. */
export function estadoInicialContexto(
  actorTipo: string,
  pedido: EstadoContexto | undefined,
): EstadoContexto {
  return actorTipo === "user" && pedido === "confirmado" ? "confirmado" : "inferido";
}

/** Solo una persona confirma: un agente no puede convertir su propia inferencia en hecho. */
export function puedeConfirmarContexto(actorTipo: string): boolean {
  return actorTipo === "user";
}

export type OpcionesContextoGenerado = {
  /** Por defecto solo lo confirmado. Lo inferido, si se incluye, va rotulado como tal. */
  incluirInferido?: boolean;
  maxEntradas?: number;
};

/**
 * Líneas de contexto para alimentar un texto generado: más recientes primero, cada una con su fuente y
 * fecha; lo inferido solo si se pide y siempre marcado «(inferido)».
 */
export function contextoParaGenerar(
  entradas: readonly EntradaContexto[],
  op: OpcionesContextoGenerado = {},
): string[] {
  return entradas
    .filter((e) => e.estado === "confirmado" || op.incluirInferido === true)
    .slice()
    .sort((a, b) => b.fechaFuente.localeCompare(a.fechaFuente))
    .slice(0, op.maxEntradas ?? 20)
    .map(
      (e) =>
        `${e.fechaFuente} · ${e.fuente}${e.estado === "inferido" ? " (inferido)" : ""}: ${e.resumen.trim()}`,
    );
}

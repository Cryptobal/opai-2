// Lógica pura de Comercial (sin db, sin Next): estado derivado del tipo de etapa (R8), días en una
// etapa (R11) y requisitos de entrada por etapa (R9). Se prueba con Vitest.

export const TIPOS_ETAPA = ["abierta", "ganada", "perdida"] as const;
export type TipoEtapa = (typeof TIPOS_ETAPA)[number];

export const ESTADOS_NEGOCIO = ["abierto", "ganado", "perdido"] as const;
export type EstadoNegocio = (typeof ESTADOS_NEGOCIO)[number];

export const TIPOS_VINCULO = ["nueva", "ampliacion", "renovacion", "reemplazo"] as const;
export const ROLES_CONTACTO = ["decisor", "tecnico", "compras", "usuario"] as const;
export const TONOS_ETAPA = ["neutral", "success", "danger", "warning", "info"] as const;

/** Requisitos de entrada que una etapa puede exigir (R9). */
export const REQUISITOS = [
  "monto",
  "fecha_cierre",
  "cotizacion_enviada",
  "inicio_servicio",
  "motivo_perdida",
] as const;
export type Requisito = (typeof REQUISITOS)[number];

/** El estado del negocio sale del tipo de la etapa en que está (R8). */
export function estadoDeTipo(tipo: string): EstadoNegocio {
  return tipo === "ganada" ? "ganado" : tipo === "perdida" ? "perdido" : "abierto";
}

/** Segundos entre dos instantes (nunca negativo). */
export function segundosEntre(desde: Date, hasta: Date): number {
  return Math.max(0, Math.round((hasta.getTime() - desde.getTime()) / 1000));
}

/** Días completos entre dos instantes (para "días en la etapa"). */
export function diasEntre(desde: Date, hasta: Date): number {
  return Math.floor(segundosEntre(desde, hasta) / 86_400);
}

/** Datos del negocio relevantes para evaluar los requisitos de una etapa. */
export type DatosRequisito = {
  montoEstimadoMensual?: number | null;
  valorMensual?: number | null;
  cierreEstimado?: Date | string | null;
  cotizacionEnviadaEn?: Date | string | null;
  inicioServicioEstimado?: Date | string | null;
  motivoPerdidaId?: string | null;
};

const tiene = (v: unknown) => v !== null && v !== undefined && v !== "";

/** Qué requisitos de `exige` no cumple el negocio (R9). Lista vacía = puede entrar. */
export function requisitosFaltantes(exige: readonly string[], n: DatosRequisito): Requisito[] {
  const faltan: Requisito[] = [];
  for (const req of exige) {
    const ok =
      req === "monto"
        ? (n.montoEstimadoMensual ?? 0) > 0 || (n.valorMensual ?? 0) > 0
        : req === "fecha_cierre"
          ? tiene(n.cierreEstimado)
          : req === "cotizacion_enviada"
            ? tiene(n.cotizacionEnviadaEn)
            : req === "inicio_servicio"
              ? tiene(n.inicioServicioEstimado)
              : req === "motivo_perdida"
                ? tiene(n.motivoPerdidaId)
                : true;
    if (!ok && (REQUISITOS as readonly string[]).includes(req)) faltan.push(req as Requisito);
  }
  return faltan;
}

/** Etiqueta legible de un requisito, para el mensaje de "qué falta" (CA3). */
export function etiquetaRequisito(req: string): string {
  const m: Record<string, string> = {
    monto: "monto estimado",
    fecha_cierre: "fecha de cierre",
    cotizacion_enviada: "cotización enviada",
    inicio_servicio: "inicio de servicio",
    motivo_perdida: "motivo de pérdida",
  };
  return m[req] ?? req;
}

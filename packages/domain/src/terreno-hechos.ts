/** Hechos que el equipo de terreno captura sin señal y envía en lote (CAR-78 · B3). Aritmética pura del reloj. */

/** Hechos por lote y tamaño máximo del cuerpo: el equipo parte el envío si junta más. */
export const LOTE_MAXIMO_HECHOS = 50;
export const LOTE_MAXIMO_BYTES = 256 * 1024;

/** Desde este desfase entre el reloj del equipo y el del servidor, el hecho queda marcado (no se descarta). */
export const DESFASE_ALTO_MS = 10 * 60_000;
/** Un hecho no puede ser posterior a su propio envío, salvo este margen de redondeo del reloj. */
export const TOLERANCIA_FUTURO_MS = 60_000;
/** Un hecho más antiguo que esto (equipo sin señal por semanas) se rechaza: el equipo lo conserva. */
export const ANTIGUEDAD_MAXIMA_MS = 14 * 24 * 3_600_000;

export type MotivoHechoNoPlausible = "posterior_al_envio" | "muy_antiguo";

/** Desfase = hora del servidor al recibir − hora del equipo al enviar (positivo: el equipo va atrasado). */
export function calcularDesfaseMs(horaEnvio: Date, recibidoEn: Date): number {
  return recibidoEn.getTime() - horaEnvio.getTime();
}

/** Lleva la hora del hecho (reloj del equipo) a la hora del servidor, corrigiendo el desfase. */
export function horaCorregida(horaHecho: Date, desfaseMs: number): Date {
  return new Date(horaHecho.getTime() + desfaseMs);
}

export function desfaseAlto(desfaseMs: number): boolean {
  return Math.abs(desfaseMs) > DESFASE_ALTO_MS;
}

/** El hecho debe haber ocurrido antes de enviarse y no hace más de dos semanas. */
export function hechoPlausible(
  horaHecho: Date,
  horaEnvio: Date,
): { ok: true } | { ok: false; motivo: MotivoHechoNoPlausible } {
  const antesDelEnvio = horaEnvio.getTime() - horaHecho.getTime();
  if (antesDelEnvio < -TOLERANCIA_FUTURO_MS) return { ok: false, motivo: "posterior_al_envio" };
  if (antesDelEnvio > ANTIGUEDAD_MAXIMA_MS) return { ok: false, motivo: "muy_antiguo" };
  return { ok: true };
}

/**
 * Política de la cola sin conexión por operación (orden de Carlos, 7-nov-2026): solo se encola lo que es
 * seguro e idempotente. Un hecho lleva su `clave`, así que reenviarlo no duplica; pero lo que exige una sesión
 * en línea (prueba facial, prueba de vida, PIN) NO se puede encolar: se verificaría fuera de su momento.
 * Cada módulo de terreno agrega aquí los tipos que sí admite, en su propio PR.
 */
export const TIPOS_ENCOLABLES_OFFLINE = [
  "terreno.latido",
  "rondas.marca",
  "rondas.inicio",
  "rondas.cierre",
  "rondas.novedad",
  "acceso.entrada",
  "acceso.salida",
] as const;

/** Partes del nombre de un tipo que delatan una verificación de identidad en línea. */
const PARTES_SOLO_EN_LINEA = ["facial", "rostro", "biometria", "prueba_vida", "pin"];

/** ¿El tipo exige estar en línea (rostro, prueba de vida, PIN)? Nunca se encola, aunque alguien lo declare. */
export function esTipoSoloEnLinea(tipo: string): boolean {
  return tipo
    .toLowerCase()
    .split(/[.:/-]/)
    .some((parte) => PARTES_SOLO_EN_LINEA.some((p) => parte === p || parte.startsWith(`${p}_`)));
}

/** ¿Se puede guardar en el teléfono y enviar después? Solo los tipos declarados y que no exijan línea. */
export function esTipoEncolable(tipo: string): boolean {
  return (TIPOS_ENCOLABLES_OFFLINE as readonly string[]).includes(tipo) && !esTipoSoloEnLinea(tipo);
}

// Máquina de estados de las correcciones (L-24, L-25, L-27): pendiente → aceptada | objetada | vencida.
// Una corrección es un hecho nuevo que referencia la marca; el original nunca se toca. El plazo es un
// parámetro con vigencia (ADR-021), por defecto 48 h desde el sello del servidor; el texto íntegro de
// la Res. 38 (el ORD 626/2024 habla del «día hábil siguiente») está por confirmar, así que no es fijo.

import type { TipoMarca } from "./tipos";

export const PLAZO_CORRECCION_HORAS_DEFECTO = 48;

export type EstadoCorreccion = "pendiente" | "aceptada" | "objetada" | "vencida";
export type ResultadoRespuesta = "aceptada" | "objetada";

export type ValorMarca = { tipo: TipoMarca; hora: Date };

/** Cuándo vence el plazo para responder: el sello del servidor más el plazo. */
export function venceEn(selloServidor: Date, plazoHoras: number): Date {
  return new Date(selloServidor.getTime() + plazoHoras * 3_600_000);
}

/** Estado vigente: con respuesta, la respuesta; sin ella, pendiente hasta el plazo y vencida después. */
export function estadoCorreccion(
  c: { selloServidor: Date; plazoHoras: number },
  respuesta: ResultadoRespuesta | null,
  ahora: Date,
): EstadoCorreccion {
  if (respuesta) return respuesta;
  return ahora.getTime() >= venceEn(c.selloServidor, c.plazoHoras).getTime() ? "vencida" : "pendiente";
}

export type Senal = "pendiente" | "corregida" | "objetada" | "vencida_aceptada";

export type ValorEfectivo = {
  /** El valor que usan los reportes y los días. */
  valor: ValorMarca;
  original: ValorMarca;
  /** Cómo se señala la alteración en pantalla y en el reporte; nulo si la marca no se tocó. */
  senal: Senal | null;
};

/**
 * Qué valor rige. Pendiente u objetada: el original (la objeción deja la marca en disputa, señalada);
 * aceptada: la propuesta; vencida sin respuesta: se tiene por aceptada (derecho de oposición). La
 * alteración queda señalada en todos los casos y el original sigue visible.
 */
export function valorEfectivo(
  original: ValorMarca,
  propuesta: ValorMarca | null,
  estado: EstadoCorreccion | null,
): ValorEfectivo {
  if (!propuesta || !estado) return { valor: original, original, senal: null };
  if (estado === "aceptada") return { valor: propuesta, original, senal: "corregida" };
  if (estado === "vencida") return { valor: propuesta, original, senal: "vencida_aceptada" };
  if (estado === "objetada") return { valor: original, original, senal: "objetada" };
  return { valor: original, original, senal: "pendiente" };
}

export type DatosRespuesta = { resultado: ResultadoRespuesta; comentario?: string | undefined };

/** Objetar exige comentario (L-25); aceptar no. */
export function respuestaValida(r: DatosRespuesta): boolean {
  return r.resultado === "aceptada" || (r.comentario?.trim().length ?? 0) >= 3;
}

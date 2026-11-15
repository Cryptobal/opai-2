// Cadena de escalamiento (spec R7, R8, §4 y pregunta 7). Puro: sin base de datos.

import type { Severidad } from "./index";

export const CANALES = ["campana", "push", "whatsapp", "sms", "correo", "llamada"] as const;
export type Canal = (typeof CANALES)[number];

/**
 * A quién contacta un paso. «guardia» es la persona de la alerta; «supervisores», los de la
 * instalación; «rol», todos los miembros activos con ese rol; «usuario», una persona puntual.
 * El operador de turno y el jefe de operaciones de respaldo llegan con el turno de central (CAR-470).
 */
export type Destinatario =
  | { tipo: "guardia" }
  | { tipo: "supervisores" }
  | { tipo: "rol"; rol: "owner" | "admin" | "gerente" | "supervisor" }
  | { tipo: "usuario"; usuarioId: string };

export type Paso = {
  destinatario: Destinatario;
  canales: Canal[];
  /** Minutos antes de pasar al siguiente paso. */
  esperaMin: number;
  /** El paso se cumple solo cuando alguien responde «me hago cargo». */
  exigeConfirmacion: boolean;
};

/**
 * Canales que de verdad salen en la v1: solo la campana de OPAI. Los demás quedan guardados y
 * apagados hasta que la empresa los active (R6, silencio hacia afuera por defecto).
 */
export const CANALES_ACTIVOS: readonly Canal[] = ["campana"];

/** Plantilla de la vertical (pregunta 7, decidida); el operador y el jefe esperan a CAR-470. */
export const CADENA_POR_DEFECTO: readonly Paso[] = [
  { destinatario: { tipo: "guardia" }, canales: ["campana", "push"], esperaMin: 3, exigeConfirmacion: false },
  { destinatario: { tipo: "supervisores" }, canales: ["campana", "push", "whatsapp"], esperaMin: 5, exigeConfirmacion: true },
  { destinatario: { tipo: "rol", rol: "gerente" }, canales: ["campana", "llamada"], esperaMin: 10, exigeConfirmacion: true },
  { destinatario: { tipo: "rol", rol: "admin" }, canales: ["campana"], esperaMin: 15, exigeConfirmacion: true },
];

export const PLAZO_ATENCION_POR_DEFECTO_MIN = 30;

type CadenaGuardada = { instalacionId: string | null; severidad: string | null };

/**
 * La cadena que rige una alerta: la más específica gana (instalación y severidad, solo instalación,
 * solo severidad, empresa). Sin ninguna, la de la plantilla (null).
 */
export function elegirCadena<C extends CadenaGuardada>(
  cadenas: readonly C[],
  instalacionId: string,
  severidad: Severidad,
): C | null {
  const puntaje = (c: C) => {
    if (c.instalacionId && c.instalacionId !== instalacionId) return -1;
    if (c.severidad && c.severidad !== severidad) return -1;
    return (c.instalacionId ? 2 : 0) + (c.severidad ? 1 : 0);
  };
  let mejor: C | null = null;
  for (const c of cadenas) if (puntaje(c) >= 0 && (!mejor || puntaje(c) > puntaje(mejor))) mejor = c;
  return mejor;
}

/** Pasos que se contactan juntos: en una crítica, los pasos 2 y 3 a la vez (pregunta 7). */
export function pasosSimultaneos(numero: number, total: number, severidad: Severidad): number[] {
  if (severidad === "critica" && numero === 2 && total >= 3) return [2, 3];
  return [numero];
}

/** Siguiente paso tras `actual` (los simultáneos cuentan como uno), o null si no queda. */
export function siguientePaso(actual: number, total: number, severidad: Severidad): number | null {
  const ultimo = Math.max(...pasosSimultaneos(actual, total, severidad));
  return ultimo + 1 <= total ? ultimo + 1 : null;
}

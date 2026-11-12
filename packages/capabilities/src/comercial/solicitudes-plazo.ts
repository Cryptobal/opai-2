// Plazo de primera respuesta de una solicitud (CAR-299). Lógica pura: sin base de datos ni Next.
import { z } from "zod";

import { sumarHorasHabiles } from "./horario-habil";

export const PLAZOS_PRIMERA_RESPUESTA = [
  "sin_plazo",
  "dentro",
  "fuera",
  "a_tiempo",
  "tarde",
  "sin_dato",
] as const;
export type PlazoPrimeraRespuesta = (typeof PLAZOS_PRIMERA_RESPUESTA)[number];

export const plazoSchema = z.object({
  estado: z.enum(PLAZOS_PRIMERA_RESPUESTA),
  venceEn: z.string().nullable(),
});
export type Plazo = z.infer<typeof plazoSchema>;

/**
 * Dónde está una solicitud respecto del tiempo objetivo de la empresa. `horas` son horas hábiles (lunes a
 * viernes, 8:00 a 18:00) y 0 significa apagado.
 * Pendiente: «dentro» o «fuera» según la hora actual. Atendida: «a_tiempo» o «tarde» según cuándo se
 * atendió. Una solicitud ya atendida antes de que existiera el registro queda «sin_dato».
 */
export function plazoPrimeraRespuesta(
  s: { estado: string; createdAt: Date; primeraRespuestaEn: Date | null },
  horas: number,
  ahora: Date,
): Plazo {
  if (!(horas > 0)) return { estado: "sin_plazo", venceEn: null };
  const vence = sumarHorasHabiles(s.createdAt, horas);
  const venceEn = vence.toISOString();
  if (s.primeraRespuestaEn) {
    return { estado: s.primeraRespuestaEn <= vence ? "a_tiempo" : "tarde", venceEn };
  }
  if (s.estado !== "nueva") return { estado: "sin_dato", venceEn };
  return { estado: ahora <= vence ? "dentro" : "fuera", venceEn };
}

export const resumenPlazoSchema = z.object({
  objetivoHoras: z.number().int(),
  atendidas: z.number().int().describe("Solicitudes del período ya atendidas con hora registrada."),
  aTiempo: z.number().int(),
  tarde: z.number().int(),
  pendientesDentro: z.number().int(),
  pendientesFuera: z.number().int(),
  cumplimientoPct: z.number().int().nullable().describe("A tiempo sobre atendidas, 0–100; null sin atendidas."),
});

/** Resumen del período: cuántas se atendieron a tiempo y cuántas esperan fuera de plazo. */
export function resumenPrimeraRespuesta(
  filas: { estado: string; createdAt: Date; primeraRespuestaEn: Date | null }[],
  horas: number,
  ahora: Date,
): z.infer<typeof resumenPlazoSchema> | null {
  if (!(horas > 0)) return null;
  const c = { a_tiempo: 0, tarde: 0, dentro: 0, fuera: 0 };
  for (const f of filas) {
    const p = plazoPrimeraRespuesta(f, horas, ahora).estado;
    if (p === "a_tiempo" || p === "tarde" || p === "dentro" || p === "fuera") c[p] += 1;
  }
  const atendidas = c.a_tiempo + c.tarde;
  return {
    objetivoHoras: horas,
    atendidas,
    aTiempo: c.a_tiempo,
    tarde: c.tarde,
    pendientesDentro: c.dentro,
    pendientesFuera: c.fuera,
    cumplimientoPct: atendidas ? Math.round((c.a_tiempo / atendidas) * 100) : null,
  };
}

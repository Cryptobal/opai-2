import { evaluarRostro, type Contexto } from "@opai/capabilities";

import type { ResultadoIdentidad } from "../domain";
import { rostroHabilitado } from "./rostro-comun";

/**
 * Verificación 1:1 del rostro de la persona (T-03) con la biometría del núcleo (B4): consentimiento vigente,
 * enrolamiento activo, prueba de vida y similitud sobre el umbral de la plataforma. Cualquier falla devuelve
 * un motivo para caer a RUT + PIN; nunca se marca por rostro sin todo eso (denegación segura).
 */
export async function verificarRostro(ctx: Contexto, personaId: string, muestra: string | undefined): Promise<ResultadoIdentidad> {
  if (!(await rostroHabilitado(ctx))) return { ok: false, motivo: "metodo_no_disponible" };
  if (!muestra) return { ok: false, motivo: "vida_fallida" };
  const r = await evaluarRostro(ctx, personaId, muestra);
  switch (r.tipo) {
    case "sin_enrolamiento": return { ok: false, motivo: "sin_enrolamiento" };
    case "no_disponible": return { ok: false, motivo: "metodo_no_disponible" };
    case "proveedor_caido": return { ok: false, motivo: "proveedor_caido" };
    case "muestra_invalida": return { ok: false, motivo: "vida_fallida" };
    case "resultado":
      if (!r.vivo) return { ok: false, motivo: "vida_fallida" };
      if (!r.verificado) return { ok: false, motivo: "rostro_no_coincide" };
      return { ok: true, metodo: "rostro", motivoRespaldo: null, confianza: r.puntaje / 100, pruebaVida: true };
  }
  return { ok: false, motivo: "metodo_no_disponible" };
}

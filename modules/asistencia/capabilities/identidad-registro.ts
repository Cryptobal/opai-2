import { type Contexto } from "@opai/capabilities";

import { verificadorPinSimulado, type VerificadorIdentidad } from "../domain";
import { verificarRostro } from "./identidad-rostro";
import { verificarPinDePersona } from "./identidad-pin";

let real: VerificadorIdentidad | null = null;

/** Sustituye el verificador (solo pruebas). Sin él se usa RUT + PIN de terreno y, si está habilitado, el rostro. */
export function fijarVerificadorIdentidad(v: VerificadorIdentidad | null): void {
  real = v;
}

export const PIN_SIMULADO = "123456";

/**
 * Verificador de identidad de la empresa (D-02): rostro con prueba de vida como método principal y RUT + PIN
 * como secundario, siempre disponible. En una empresa de prueba (slug `qa-…`) una persona sin PIN asignado
 * marca con el PIN simulado, para no frenar las pruebas de la marca.
 */
export async function verificadorDe(ctx: Contexto): Promise<VerificadorIdentidad> {
  if (real) return real;
  const t = await ctx.db.tenant.findUnique({ where: { id: ctx.tenantId }, select: { slug: true } });
  const esPrueba = !!t?.slug.startsWith("qa-");
  return {
    async verificar(s) {
      if (s.metodo === "rostro") return verificarRostro(ctx, s.personaId, s.muestra);
      if (s.metodo === "manual_contingencia") return { ok: false, motivo: "metodo_no_disponible" };
      const tienePin = (await ctx.db.credencialTerreno.count({ where: { personaId: s.personaId } })) > 0;
      if (!tienePin && esPrueba) return verificadorPinSimulado(new Map([[s.personaId, PIN_SIMULADO]])).verificar(s);
      const r = await verificarPinDePersona(ctx, s.personaId, s.credencial);
      return r.ok
        ? { ok: true, metodo: s.metodo, motivoRespaldo: s.motivoRespaldo ?? null, confianza: null, pruebaVida: null }
        : r;
    },
  };
}

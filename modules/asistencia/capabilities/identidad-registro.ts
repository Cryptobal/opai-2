import { type Contexto } from "@opai/capabilities";

import { verificadorPinSimulado, type VerificadorIdentidad } from "../domain";

let real: VerificadorIdentidad | null = null;

/**
 * Conecta el verificador real (RUT + PIN y biometría de «Operaciones · Base») sin tocar sus archivos.
 * Mientras no exista, solo las empresas de prueba (slug `qa-…`) registran marcas, con PIN simulado.
 */
export function fijarVerificadorIdentidad(v: VerificadorIdentidad | null): void {
  real = v;
}

export const PIN_SIMULADO = "123456";

export async function verificadorDe(ctx: Contexto): Promise<VerificadorIdentidad | null> {
  if (real) return real;
  const t = await ctx.db.tenant.findUnique({ where: { id: ctx.tenantId }, select: { slug: true } });
  if (!t?.slug.startsWith("qa-")) return null;
  const personas = await ctx.db.persona.findMany({ select: { id: true } });
  return verificadorPinSimulado(new Map(personas.map((p) => [p.id, PIN_SIMULADO])));
}

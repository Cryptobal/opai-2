import { credencialDePlataforma, definicionIntegracion } from "@opai/integrations";

import type { Contexto } from "../types";
import { leerSecreto } from "./secretos";

export type Credencial = { valor: string; modalidad: "plataforma" | "propia" };

/** Fila de integración del tenant (o los valores por defecto si nunca se configuró). */
export async function integracionDe(ctx: Contexto, proveedor: string) {
  const fila = await ctx.db.integracion.findUnique({
    where: { tenantId_proveedor: { tenantId: ctx.tenantId, proveedor } },
  });
  return fila ?? null;
}

/**
 * Credencial efectiva (ADR-027): la propia cifrada si la modalidad es "propia"; si no, la de
 * plataforma del entorno. null si no hay ninguna disponible.
 */
export async function credencialDe(ctx: Contexto, proveedor: string): Promise<Credencial | null> {
  const def = definicionIntegracion(proveedor);
  if (!def?.disponible) return null;
  const fila = await integracionDe(ctx, proveedor);
  const modalidad = fila?.modalidad === "propia" ? "propia" : "plataforma";
  if (modalidad === "propia") {
    const valor = fila ? await leerSecreto(ctx, fila.id, "api_key") : null;
    return valor ? { valor, modalidad } : null;
  }
  if (!def.modalidades.includes("plataforma")) return null;
  const valor = credencialDePlataforma(proveedor);
  return valor ? { valor, modalidad } : null;
}

/** Estado visible de una integración para el tenant (sin secretos). */
export function estadoIntegracion(
  def: NonNullable<ReturnType<typeof definicionIntegracion>>,
  fila: Awaited<ReturnType<typeof integracionDe>>,
  secretosConfigurados: readonly string[],
) {
  if (!def.disponible) return "proximamente";
  if (fila?.estado === "error") return "error";
  const modalidad =
    fila?.modalidad ?? (def.modalidades.includes("plataforma") ? "plataforma" : "propia");
  if (modalidad === "plataforma")
    return credencialDePlataforma(def.id) ? "configurada" : "no_disponible";
  return def.secretos.every((s) => s.opcional || secretosConfigurados.includes(s.nombre))
    ? "configurada"
    : "no_configurada";
}

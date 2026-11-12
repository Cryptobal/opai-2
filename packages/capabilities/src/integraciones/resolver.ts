import {
  appSlackDelEntorno,
  credencialDePlataforma,
  type DefinicionIntegracion,
  definicionIntegracion,
} from "@opai/integrations";

import { ajuste } from "../core/config/valores";

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

/** Una integración restringida solo existe para las empresas que Plataforma habilitó (CAR-321). */
export async function integracionHabilitada(ctx: Contexto, def: DefinicionIntegracion): Promise<boolean> {
  if (!def.soloHabilitadas) return true;
  const habilitadas = await ajuste<Record<string, string[]>>(ctx, "core", "integraciones_habilitadas");
  return (habilitadas[def.id] ?? []).includes(ctx.tenantId);
}

/** Las del catálogo que esta empresa puede ver, en el mismo orden. */
export async function integracionesVisibles(ctx: Contexto, defs: readonly DefinicionIntegracion[]) {
  const ok = await Promise.all(defs.map((d) => integracionHabilitada(ctx, d)));
  return defs.filter((_, i) => ok[i]);
}

/** Definición del catálogo solo si la empresa puede verla; si no, como si no existiera. */
export async function definicionVisible(ctx: Contexto, proveedor: string): Promise<DefinicionIntegracion | undefined> {
  const def = definicionIntegracion(proveedor);
  return def && (await integracionHabilitada(ctx, def)) ? def : undefined;
}

/**
 * Credencial efectiva (ADR-027): la propia cifrada si la modalidad es "propia"; si no, la de
 * plataforma del entorno. null si no hay ninguna disponible.
 */
export async function credencialDe(ctx: Contexto, proveedor: string): Promise<Credencial | null> {
  const def = await definicionVisible(ctx, proveedor);
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
  // Slack (ADR-093): configurada solo si la empresa instaló la app; sin la app en el entorno, no disponible.
  if (def.id === "slack") {
    if (fila?.estado === "configurada") return "configurada";
    return appSlackDelEntorno() ? "no_configurada" : "no_disponible";
  }
  const modalidad =
    fila?.modalidad ?? (def.modalidades.includes("plataforma") ? "plataforma" : "propia");
  if (modalidad === "plataforma")
    return credencialDePlataforma(def.id) ? "configurada" : "no_disponible";
  return def.secretos.every((s) => s.opcional || secretosConfigurados.includes(s.nombre))
    ? "configurada"
    : "no_configurada";
}

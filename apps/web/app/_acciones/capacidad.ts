"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { obtenerCapacidad, type Resultado } from "@opai/capabilities";

import { ejecutarComoUsuario, identidadActual } from "@/lib/servidor";
import { COOKIE_TENANT, membresiasUsables } from "@/lib/tenant-actual";

/**
 * Acción de servidor genérica: la UI invoca capacidades con las mismas reglas que /api/v1
 * (sesión, tenant, módulo, permiso, auditoría y telemetría). Las internas no pasan por aquí.
 */
export async function ejecutarCapacidad(
  portal: string,
  id: string,
  input: unknown,
  dryRun = false,
): Promise<Resultado> {
  const capacidad = obtenerCapacidad(id);
  if (!capacidad || capacidad.interna) {
    return { ok: false, error: { code: "NOT_FOUND", message: `Capacidad "${id}" no existe.` } };
  }
  const r = await ejecutarComoUsuario(portal, id, input, dryRun);
  // Una escritura real vacía la caché del navegador (staleTimes de 5 min, ADR-045): en la
  // pestaña que escribe, lo visitado después no muestra datos anteriores. Otras pestañas y las
  // escrituras por API/MCP se ven al vencer el tiempo o al refresco silencioso.
  if (r.ok && !dryRun && capacidad.efecto !== "lectura") revalidatePath("/", "layout");
  return r;
}

/** Cambia la empresa actual (solo entre membresías utilizables) y va al destino (interno). */
export async function cambiarTenant(tenantId: string, destino = "/"): Promise<void> {
  const identidad = await identidadActual();
  if (!identidad) redirect("/login");
  if (!membresiasUsables(identidad.membresias).some((m) => m.tenantId === tenantId)) return;
  (await cookies()).set(COOKIE_TENANT, tenantId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  redirect(destino.startsWith("/") && !destino.startsWith("//") ? destino : "/");
}

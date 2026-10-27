"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { obtenerCapacidad, type Resultado } from "@opai/capabilities";

import { ejecutarComoUsuario, identidadActual, tieneAccesoAPortal } from "@/lib/servidor";
import { COOKIE_TENANT, membresiasUsables } from "@/lib/tenant-actual";
import { destinoDeInicio } from "@/lib/portal-inicio";

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
  // La UI solo puede invocar capacidades del portal al que el usuario tiene acceso en la empresa
  // actual (ADR-016): sin acceso, ni la búsqueda (⌘K) ni la campana ni nada del shell devuelven
  // datos del portal ajeno, igual que la página muestra «Sin permisos». Ocultarlo en la UI no basta
  // (`marco-shell.tsx` ya no ofrece búsqueda ni ⌘K sin acceso); el guard vive también aquí.
  // El portal se valida ANTES de mirar si la capacidad existe (NÚCLEO-D1): un portal ajeno a la
  // membresía siempre da el mismo FORBIDDEN, exista o no la capacidad, para que probar ids no
  // revele el catálogo de capacidades a quien no tiene ese portal.
  const identidad = await identidadActual();
  if (!identidad) {
    return { ok: false, error: { code: "UNAUTHENTICATED", message: "Inicia sesión." } };
  }
  if (!tieneAccesoAPortal(identidad, portal)) {
    return { ok: false, error: { code: "FORBIDDEN", message: "No tienes acceso a este portal." } };
  }
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
export async function cambiarTenant(tenantId: string, destino?: string): Promise<void> {
  const identidad = await identidadActual();
  if (!identidad) redirect("/login");
  const actual = membresiasUsables(identidad.membresias).find((m) => m.tenantId === tenantId);
  if (!actual) return;
  (await cookies()).set(COOKIE_TENANT, tenantId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  redirect(destinoDeInicio({ ...identidad, actual }, destino));
}

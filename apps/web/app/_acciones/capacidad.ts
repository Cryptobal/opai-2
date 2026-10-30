"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";

import { obtenerCapacidad, type Resultado } from "@opai/capabilities";

import { ejecutarComoUsuario, identidadActual, tieneAccesoAPortal } from "@/lib/servidor";
import { COOKIE_TENANT, membresiasUsables } from "@/lib/tenant-actual";
import { destinoDeInicio } from "@/lib/portal-inicio";

/**
 * Alcance de la invalidación de caché tras una escritura real:
 * - `"layout"` (defecto): invalida todo el layout raíz, como antes. Lo usan las escrituras de
 *   negocio para que la pestaña que escribe no muestre datos anteriores (staleTimes de 5 min, ADR-045).
 * - `"ninguna"`: no invalida nada. Para cambios que ya se reflejan en el cliente y no cambian lo que
 *   pinta ninguna pantalla desde el servidor (las preferencias propias: el tema se aplica en el acto
 *   y se relee al navegar). Evita que guardar una preferencia vuelva a correr las capacidades del
 *   layout (`core.cumplimiento.rat`, contadores, etc.) y que una ráfaga re-renderice el formulario
 *   desde el servidor a mitad de los clics (B1, P2028 y tema que revertía del QA en vivo del #135).
 */
export type Revalidacion = "layout" | "ninguna";

/**
 * Acción de servidor genérica: la UI invoca capacidades con las mismas reglas que /api/v1
 * (sesión, tenant, módulo, permiso, auditoría y telemetría). Las internas no pasan por aquí.
 * Nunca lanza: si la sesión o la conexión a la base fallan (pool agotado tras reanudar la
 * instancia), devuelve INTERNAL con una referencia para que la UI revierta y avise; un rechazo
 * de la acción dejaba la pantalla con el cambio optimista y sin aviso.
 */
export async function ejecutarCapacidad(
  portal: string,
  id: string,
  input: unknown,
  dryRun = false,
  revalidar: Revalidacion = "layout",
): Promise<Resultado> {
  let r: Resultado;
  let escritura: boolean;
  try {
    ({ r, escritura = false } = await ejecutar(portal, id, input, dryRun));
  } catch (e) {
    unstable_rethrow(e); // redirect/notFound y señales internas de Next no son errores.
    const ref = crypto.randomUUID();
    // Log categórico (CAR-49): sin input, sesión ni mensaje crudo de pg o Better Auth.
    console.error("[capacidad] error_interno", {
      evento: "capacidad.error_interno",
      capacidad: id,
      portal,
      code: "INTERNAL",
      errorName: e instanceof Error ? e.name : typeof e,
      correlacion: ref,
    });
    const message = `Ocurrió un error inesperado. Reintenta en unos minutos. (ref: ${ref})`;
    return { ok: false, error: { code: "INTERNAL", message, detalles: { ref } } };
  }
  // Fuera del try: si la escritura ya se guardó, la UI recibe su resultado aunque esto fallara.
  // Una escritura real vacía la caché del navegador (staleTimes de 5 min, ADR-045): en la
  // pestaña que escribe, lo visitado después no muestra datos anteriores. Otras pestañas y las
  // escrituras por API/MCP se ven al vencer el tiempo o al refresco silencioso.
  if (escritura && revalidar === "layout") {
    try {
      revalidatePath("/", "layout");
    } catch {
      console.error("[capacidad] revalidar_fallo", {
        evento: "capacidad.revalidar_fallo",
        capacidad: id,
      });
    }
  }
  return r;
}

async function ejecutar(
  portal: string,
  id: string,
  input: unknown,
  dryRun: boolean,
): Promise<{ r: Resultado; escritura?: boolean }> {
  // La UI solo puede invocar capacidades del portal al que el usuario tiene acceso en la empresa
  // actual (ADR-016): sin acceso, ni la búsqueda (⌘K) ni la campana ni nada del shell devuelven
  // datos del portal ajeno, igual que la página muestra «Sin permisos». Ocultarlo en la UI no basta
  // (`marco-shell.tsx` ya no ofrece búsqueda ni ⌘K sin acceso); el guard vive también aquí.
  // El portal se valida ANTES de mirar si la capacidad existe (NÚCLEO-D1): un portal ajeno a la
  // membresía siempre da el mismo FORBIDDEN, exista o no la capacidad, para que probar ids no
  // revele el catálogo de capacidades a quien no tiene ese portal.
  const identidad = await identidadActual();
  if (!identidad) {
    return { r: { ok: false, error: { code: "UNAUTHENTICATED", message: "Inicia sesión." } } };
  }
  if (!tieneAccesoAPortal(identidad, portal)) {
    const message = "No tienes acceso a este portal.";
    return { r: { ok: false, error: { code: "FORBIDDEN", message } } };
  }
  const capacidad = obtenerCapacidad(id);
  if (!capacidad || capacidad.interna) {
    const message = `Capacidad "${id}" no existe.`;
    return { r: { ok: false, error: { code: "NOT_FOUND", message } } };
  }
  const r = await ejecutarComoUsuario(portal, id, input, dryRun);
  return { r, escritura: r.ok && !dryRun && capacidad.efecto !== "lectura" };
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

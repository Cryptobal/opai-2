import type { MembresiaConTenant } from "./fuentes";

/** Cookie con el tenant elegido por el usuario (selector de empresa). */
export const COOKIE_TENANT = "opai_tenant";

/** Membresías utilizables: activas y en tenants no suspendidos. */
export function membresiasUsables(membresias: readonly MembresiaConTenant[]): MembresiaConTenant[] {
  return membresias.filter((m) => m.estado === "activa" && m.tenant.estado !== "suspendido");
}

/**
 * Tenant actual: el de la cookie si es una membresía utilizable; si no, la única o la primera.
 * Nunca un tenant donde el usuario no tiene membresía activa.
 */
export function elegirMembresia(
  membresias: readonly MembresiaConTenant[],
  cookie: string | undefined,
): MembresiaConTenant | null {
  const usables = membresiasUsables(membresias);
  return usables.find((m) => m.tenantId === cookie) ?? usables[0] ?? null;
}

/** Lee una cookie de la cabecera `Cookie` de un Request. */
export function leerCookie(req: Request, nombre: string): string | undefined {
  const cabecera = req.headers.get("cookie") ?? "";
  for (const parte of cabecera.split(";")) {
    const [k, ...v] = parte.trim().split("=");
    if (k === nombre) return decodeURIComponent(v.join("="));
  }
  return undefined;
}

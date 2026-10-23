import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { executeCapability, type Contexto, type Resultado } from "@opai/capabilities";
import { getSession } from "@opai/auth";

import { contextoDeIdentidad, identidadDe, type Identidad } from "./actor";
import { asegurarRegistro } from "./registro";
import { COOKIE_TENANT } from "./tenant-actual";

asegurarRegistro();

/** Identidad del request (una vez por render gracias a `cache`), o null sin sesión. */
export const identidadActual = cache(async (): Promise<Identidad | null> => {
  const sesion = await getSession();
  if (!sesion) return null;
  const tenant = (await cookies()).get(COOKIE_TENANT)?.value;
  return identidadDe(sesion.user, tenant);
});

/** Identidad o redirección a /login. */
export async function requerirIdentidad(destino?: string): Promise<Identidad> {
  const identidad = await identidadActual();
  if (!identidad) redirect(destino ? `/login?next=${encodeURIComponent(destino)}` : "/login");
  return identidad;
}

/**
 * Acceso al portal verificado en servidor: Plataforma exige `platformRole`; los demás, una
 * membresía activa en el tenant actual que incluya el portal. Ocultar en la UI no basta.
 */
export function tieneAccesoAPortal(identidad: Identidad, portal: string): boolean {
  if (portal === "platform") return identidad.usuario.platformRole !== null;
  return identidad.actual?.portales.includes(portal) ?? false;
}

export function contextoServidor(identidad: Identidad, portal: string): Contexto {
  return contextoDeIdentidad(identidad, portal);
}

/** Ejecuta una capacidad como el usuario del request (Server Components y Server Actions). */
export async function ejecutarComoUsuario<T = unknown>(
  portal: string,
  id: string,
  input: unknown = {},
  dryRun = false,
): Promise<Resultado<T>> {
  const identidad = await identidadActual();
  if (!identidad)
    return { ok: false, error: { code: "UNAUTHENTICATED", message: "Inicia sesión." } };
  const r = await executeCapability(contextoServidor(identidad, portal), id, input, { dryRun });
  return r as Resultado<T>;
}

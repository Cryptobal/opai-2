import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { auth, type SesionAuth } from "./auth";

export type Sesion = SesionAuth;

/**
 * Sesión del request actual (Server Components, route handlers, server actions), o null. Envuelta en
 * `cache` de React: Better Auth resuelve la sesión una sola vez por petición aunque varios componentes la
 * pidan. Con `session.cookieCache` (60 s, CAR-152) la mayoría de peticiones no consulta la base; al
 * vencer la caché o en operaciones sensibles de auth se revalida contra Postgres (hot path por función
 * SECURITY DEFINER, CAR-43). `identidadActual` (`apps/web/lib/servidor.ts`) sigue leyendo membresías y
 * permisos del tenant en cada render.
 */
export const getSession = cache(async (): Promise<Sesion | null> => {
  return auth.api.getSession({ headers: await headers() });
});

/** Sesión del request o redirección a `/login`. */
export async function requireSession(): Promise<Sesion> {
  const sesion = await getSession();
  if (!sesion) redirect("/login");
  return sesion;
}

/** Sesión a partir de un Request (route handlers que no corren en el árbol de React). */
export async function sesionDeRequest(req: Request): Promise<Sesion | null> {
  return auth.api.getSession({ headers: req.headers });
}

/** Revalida una operación larga contra la base, sin caché de cookie ni renovar la sesión. */
export async function sesionVigente(cabeceras?: Headers): Promise<Sesion | null> {
  return auth.api.getSession({
    headers: cabeceras ?? (await headers()),
    query: { disableCookieCache: true, disableRefresh: true },
  });
}

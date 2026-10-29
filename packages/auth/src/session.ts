import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { auth, type SesionAuth } from "./auth";

export type Sesion = SesionAuth;

/**
 * Sesión del request actual (Server Components, route handlers, server actions), o null. Envuelta en
 * `cache` de React: Better Auth valida la sesión contra la base (`session.findFirst` + `user.findFirst`,
 * cada una en su transacción con `SET LOCAL ROLE opai_auth`, CAR-43) una sola vez por petición aunque
 * varios componentes la pidan, para no multiplicar esas transacciones bajo ráfaga (B1). `identidadActual`
 * (`apps/web/lib/servidor.ts`) ya cachea la identidad completa encima de esto.
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

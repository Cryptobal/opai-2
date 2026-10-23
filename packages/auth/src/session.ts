import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth, type SesionAuth } from "./auth";

export type Sesion = SesionAuth;

/** Sesión del request actual (Server Components, route handlers, server actions), o null. */
export async function getSession(): Promise<Sesion | null> {
  return auth.api.getSession({ headers: await headers() });
}

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

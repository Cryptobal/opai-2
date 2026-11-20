import { headers } from "next/headers";

import { APIError } from "better-auth/api";

import { auth } from "./auth";

/**
 * Ingreso con Google desde la app nativa (CAR-516, Brief 17b), visto desde las Server Actions y las
 * rutas de `apps/web`. Cualquier rechazo se devuelve como `null` o `false`, sin decir la causa.
 */

/** En el navegador del sistema: emite el código para volver a la app, o null sin sesión completa. */
export async function emitirCodigoApp(reto: string): Promise<string | null> {
  try {
    const r = await auth.api.emitirCodigoApp({ body: { reto }, headers: await headers() });
    return r.codigo;
  } catch (error) {
    if (error instanceof APIError) return null;
    throw error;
  }
}

/** En la app: canjea el código y abre la sesión (cookies por `nextCookies`). */
export async function canjearCodigoApp(codigo: string, verificador: string): Promise<boolean> {
  try {
    await auth.api.canjearCodigoApp({ body: { codigo, verificador }, headers: await headers() });
    return true;
  } catch (error) {
    if (error instanceof APIError) return false;
    throw error;
  }
}

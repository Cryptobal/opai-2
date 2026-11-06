import { cookies } from "next/headers";
import { cache } from "react";

import { dispositivoPorToken, type DispositivoReconocido } from "@opai/db";

/** Cookie con el token del dispositivo emparejado (HttpOnly; el token solo existe en el equipo y como HMAC en la base). */
export const COOKIE_DISPOSITIVO = "opai_dispositivo";

/**
 * Dispositivo de esta petición, o null si el equipo no está emparejado. Devuelve también el revocado
 * (`estado: "revocado"`) para que Terreno avise «Este dispositivo ya no está emparejado». Una consulta por
 * petición: revocar en el ERP corta el acceso en la siguiente.
 */
export const dispositivoActual = cache(async (): Promise<DispositivoReconocido | null> => {
  const token = (await cookies()).get(COOKIE_DISPOSITIVO)?.value;
  return token ? dispositivoPorToken(token, null) : null;
});

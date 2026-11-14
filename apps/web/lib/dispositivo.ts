import { cookies } from "next/headers";
import { cache } from "react";

import { dispositivoPorToken, type DispositivoReconocido } from "@opai/db";

import { COOKIE_DISPOSITIVO } from "./cookie-dispositivo";

export { COOKIE_DISPOSITIVO };

/**
 * Dispositivo de esta petición, o null si el equipo no está emparejado. Devuelve también el revocado
 * (`estado: "revocado"`) para que Terreno avise «Este dispositivo ya no está emparejado». Una consulta por
 * petición: revocar en el ERP corta el acceso en la siguiente.
 */
export const dispositivoActual = cache(async (): Promise<DispositivoReconocido | null> => {
  const token = (await cookies()).get(COOKIE_DISPOSITIVO)?.value;
  return token ? dispositivoPorToken(token, null) : null;
});

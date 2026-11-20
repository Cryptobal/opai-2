import { cookies } from "next/headers";
import { cache } from "react";

import { dispositivoPorToken, type DispositivoReconocido } from "@opai/db";

import { COOKIE_DISPOSITIVO } from "./cookie-dispositivo";
import { equipoVerComo } from "./ver-como-equipo";
import { COOKIE_VER_COMO } from "./ver-como-token";

export { COOKIE_DISPOSITIVO };

/** En «ver como» (CAR-528), el equipo lleva a quien mira: Terreno queda en solo lectura. */
export type EquipoVerComo = DispositivoReconocido & { verComo?: { porUserId: string } };

/**
 * Dispositivo de esta petición, o null si el equipo no está emparejado. Devuelve también el revocado
 * (`estado: "revocado"`) para que Terreno avise «Este dispositivo ya no está emparejado». Una consulta por
 * petición: revocar en el ERP corta el acceso en la siguiente. Con cookie «ver como», solo se usa
 * la vista validada y de solo lectura; si no es válida, nunca se cae al equipo real.
 */
export const dispositivoActual = cache(async (): Promise<EquipoVerComo | null> => {
  const jar = await cookies();
  if (jar.get(COOKIE_VER_COMO)) return equipoVerComo();
  const token = jar.get(COOKIE_DISPOSITIVO)?.value;
  return token ? dispositivoPorToken(token, null) : null;
});

/**
 * A dónde lleva `/entrar` (la puerta de la PWA y de las apps nativas, ADR-044.1 y Brief 17). Lógica
 * pura, sin Next ni base, para probar que cada perfil cae en su portal.
 */

import { loginDe } from "@/lib/login-destino";

type PortalVisible = { readonly id: string; readonly href: string };

/**
 * Con sesión: el portal guardado en este dispositivo si sigue entre los visibles, o el único que
 * tenga la persona. Con varios y sin preferencia devuelve `null` (selector). Sin ningún portal, el
 * Inicio del ERP explica qué falta.
 */
export function destinoConSesion(
  portales: readonly PortalVisible[],
  preferido: string | undefined,
): string | null {
  if (portales.length === 0) return "/";
  const guardado = portales.find((p) => p.id === preferido);
  if (guardado) return guardado.href;
  return portales.length === 1 ? (portales[0]?.href ?? null) : null;
}

/**
 * Sin sesión: un equipo de terreno emparejado entra a Terreno (o a emparejar de nuevo si lo
 * revocaron); cualquier otro va al ingreso con correo y vuelve a `/entrar`.
 */
export function destinoSinSesion(equipo: { readonly estado: string } | null): string {
  if (!equipo) return loginDe("/entrar");
  return equipo.estado === "activo" ? "/terreno" : "/terreno/emparejar";
}

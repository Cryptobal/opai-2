import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { portalesVisibles } from "@/app/_components/portales";
import { dispositivoActual } from "@/lib/dispositivo";
import { identidadActual } from "@/lib/servidor";

import { COOKIE_PORTAL } from "./cookie-portal";
import { destinoConSesion, destinoSinSesion } from "./destino";
import { SelectorPortal } from "./selector";

/**
 * Resuelve `/entrar`: con sesión, el portal de la persona (o el selector); sin sesión, Terreno si el
 * equipo está emparejado y, si no, el ingreso. Los parámetros de la URL no se conservan: la entrada
 * no recibe ninguno.
 */
export async function ContenidoEntrar() {
  const identidad = await identidadActual();
  if (!identidad) redirect(destinoSinSesion(await dispositivoActual()));
  const plataforma = identidad.usuario.platformRole !== null;
  const portales = portalesVisibles(
    identidad.actual?.portales ?? [],
    plataforma,
    identidad.modulosActivos,
  );
  const destino = destinoConSesion(portales, (await cookies()).get(COOKIE_PORTAL)?.value);
  if (destino) redirect(destino);
  return <SelectorPortal portales={portales} />;
}

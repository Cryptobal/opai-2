import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { Loading } from "@opai/ds";

import { portalesVisibles } from "@/app/_components/portales";
import { dispositivoActual } from "@/lib/dispositivo";
import { identidadActual } from "@/lib/servidor";

import { COOKIE_PORTAL } from "./cookie-portal";
import { destinoConSesion, destinoSinSesion } from "./destino";
import { SelectorPortal } from "./selector";

export const metadata = { title: "Entrar" };

async function Contenido() {
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

/**
 * Entrada de la PWA (`start_url` del manifest, ADR-044.1) y de las apps nativas (Brief 17). Con
 * sesión lleva a la persona a su portal: el guardado en este dispositivo (cookie, sin base ni
 * auditoría; D1 del Brief 04) o el único que tenga; con varios y sin preferencia, muestra un
 * selector. Sin sesión, un equipo de terreno emparejado entra a Terreno y el resto va al ingreso
 * (`proxy.ts` deja pasar `/entrar` solo cuando trae la cookie del equipo).
 */
export default function Entrar() {
  return (
    <Suspense fallback={<Loading variante="lista" className="p-4" />}>
      <Contenido />
    </Suspense>
  );
}

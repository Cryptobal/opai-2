import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { Loading } from "@opai/ds";

import { portalesVisibles } from "@/app/_components/portales";
import { requerirIdentidad } from "@/lib/servidor";

import { COOKIE_PORTAL } from "./cookie-portal";
import { SelectorPortal } from "./selector";

export const metadata = { title: "Entrar" };

async function Contenido() {
  const identidad = await requerirIdentidad("/entrar");
  const plataforma = identidad.usuario.platformRole !== null;
  const portales = portalesVisibles(identidad.actual?.portales ?? [], plataforma, identidad.modulosActivos);
  // Sin portal (sin empresa activa y sin plataforma): el Inicio del ERP explica qué falta.
  if (portales.length === 0) redirect("/");
  const preferido = (await cookies()).get(COOKIE_PORTAL)?.value;
  const guardado = portales.find((p) => p.id === preferido);
  const destino = guardado?.href ?? (portales.length === 1 ? portales[0]?.href : undefined);
  if (destino) redirect(destino);
  return <SelectorPortal portales={portales} />;
}

/**
 * Entrada de la PWA (`start_url` del manifest, ADR-044.1). Con la sesión ya resuelta lleva a la
 * persona a su portal: el guardado en este dispositivo (cookie, sin base ni auditoría; D1 del
 * Brief 04) o el único que tenga; con varios y sin preferencia, muestra un selector. Sin sesión,
 * `proxy.ts` ya manda a `/login?next=/entrar` y al entrar se vuelve aquí.
 */
export default function Entrar() {
  return (
    <Suspense fallback={<Loading variante="lista" className="p-4" />}>
      <Contenido />
    </Suspense>
  );
}

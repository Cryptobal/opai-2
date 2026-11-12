import { Suspense } from "react";
import { redirect } from "next/navigation";

import { Loading } from "@opai/ds";

import { mfaObligatoriaPara, verificarMfaDe } from "@/lib/mfa";
import { identidadActual } from "@/lib/servidor";

import { destinoSeguro } from "../destino";
import { ActivarMfa } from "./activar-mfa";

export const metadata = { title: "Activar segundo factor" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/**
 * Enrolamiento del segundo factor (NÚCLEO-F). Se llega desde Mi cuenta (opcional) o cuando la política
 * lo exige y la cuenta aún no lo tiene (owner/admin y plataforma): el gate de `PaginaPortal` manda aquí
 * antes de entrar a cualquier portal. Requiere sesión; si ya está activo, sigue al destino.
 */
async function Contenido({ searchParams }: Props) {
  const identidad = await identidadActual();
  const destino = destinoSeguro((await searchParams).next);
  if (!identidad) redirect(`/login?next=${encodeURIComponent("/activar-mfa")}`);
  // Solo la app autenticadora ya activa salta el enrolamiento: con una passkey se puede sumar la app
  // como método alternativo (CAR-286). Una sesión con el segundo factor pendiente lo verifica antes.
  if (identidad.totpActiva) redirect(destino);
  if ((await verificarMfaDe(identidad)) === "verificar")
    redirect(`/mfa?next=${encodeURIComponent(`/activar-mfa?next=${encodeURIComponent(destino)}`)}`);
  // La política decide si el enrolamiento es obligatorio (plataforma u owner/admin según el ajuste);
  // obligatorio → pie «Cerrar sesión»; opcional (desde Mi cuenta) → «volver» al origen. Se calcula en
  // servidor (ADR-022), nunca en la UI.
  const obligatoria = await mfaObligatoriaPara(identidad);
  return <ActivarMfa destino={destino} obligatoria={obligatoria} />;
}

export default function ActivarMfaPage(props: Props) {
  return (
    <Suspense fallback={<Loading variante="formulario" />}>
      <Contenido {...props} />
    </Suspense>
  );
}

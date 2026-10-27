import { redirect } from "next/navigation";

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
export default async function ActivarMfaPage({ searchParams }: Props) {
  const identidad = await identidadActual();
  const destino = destinoSeguro((await searchParams).next);
  if (!identidad) redirect(`/login?next=${encodeURIComponent("/activar-mfa")}`);
  if (identidad.mfaActiva) redirect(destino);
  return <ActivarMfa destino={destino} />;
}

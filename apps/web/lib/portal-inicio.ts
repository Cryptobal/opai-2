import { PORTALES } from "@/app/_components/portales";
import { destinoSeguro } from "@/app/(auth)/destino";

import { tieneAccesoAPortal } from "./acceso-portal";
import type { Identidad } from "./actor";

/** next explícito conserva su semántica; la preferencia nunca autoriza un portal. */
export function destinoDeInicio(identidad: Identidad, next?: string): string {
  if (next) return destinoSeguro(next);
  const m = identidad.actual;
  const permitidos = (m?.portales ?? []).filter(
    (id) =>
      PORTALES.some((p) => p.id === id) && id !== "platform" && tieneAccesoAPortal(identidad, id),
  );
  const preferido = m?.portalInicio;
  const portal = preferido && permitidos.includes(preferido) ? preferido : permitidos[0];
  return (
    PORTALES.find((p) => p.id === portal)?.href ??
    (tieneAccesoAPortal(identidad, "platform") ? "/platform" : "/")
  );
}

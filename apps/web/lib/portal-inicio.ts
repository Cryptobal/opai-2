import { idsPortalesUsables } from "@opai/domain";

import { PORTALES } from "@/app/_components/portales";
import { destinoSeguro } from "@/app/(auth)/destino";

import { tieneAccesoAPortal } from "./acceso-portal";
import type { Identidad } from "./actor";
import { contextoPortalesDe } from "./contexto-portales";

/** next explícito conserva su semántica; la preferencia nunca autoriza un portal. */
export function destinoDeInicio(identidad: Identidad, next?: string): string {
  if (next) return destinoSeguro(next);
  const m = identidad.actual;
  const usables = new Set(
    idsPortalesUsables(contextoPortalesDe(identidad)).filter((id) => id !== "platform"),
  );
  const permitidos = (m?.portales ?? []).filter((id) => usables.has(id));
  const preferido = m?.portalInicio;
  const portal = preferido && permitidos.includes(preferido) ? preferido : permitidos[0];
  return (
    PORTALES.find((p) => p.id === portal)?.href ??
    (tieneAccesoAPortal(identidad, "platform") ? "/platform" : "/")
  );
}

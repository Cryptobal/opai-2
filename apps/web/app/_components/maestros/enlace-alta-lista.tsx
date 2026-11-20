import type { LucideIcon } from "lucide-react";

import { EnlaceBotonHoja } from "./enlace-boton-hoja";

/** «Nueva» / «Nuevo» de listas maestro: siempre primario (CAR-546, revierte CAR-360). */
export function EnlaceAltaLista({
  href,
  children,
  icono,
}: {
  href: string;
  children: string;
  icono?: LucideIcon;
}) {
  return (
    <EnlaceBotonHoja
      href={href}
      variante="primary"
      {...(icono !== undefined ? { icono } : {})}
    >
      {children}
    </EnlaceBotonHoja>
  );
}
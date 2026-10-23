import type { LucideIcon } from "lucide-react";
import type { ComponentType, ReactNode } from "react";

export type NavItem = { href: string; etiqueta: string; icono: LucideIcon };

export type Portal = { id: string; etiqueta: string; href: string };

export type LinkProps = {
  href: string;
  className?: string;
  children: ReactNode;
  "aria-current"?: "page" | undefined;
};

/** Componente de enlace inyectado por la app (next/link). Por defecto, <a>. */
export type LinkComponent = ComponentType<LinkProps>;

export function esActivo(rutaActual: string, href: string): boolean {
  return href === "/"
    ? rutaActual === "/"
    : rutaActual === href || rutaActual.startsWith(`${href}/`);
}

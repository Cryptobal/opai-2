import type { LucideIcon } from "lucide-react";
import type { ComponentType, ReactNode } from "react";

export type NavItem = {
  href: string;
  etiqueta: string;
  icono: LucideIcon;
  /** Grupo en la barra lateral de desktop (Comercial, Operaciones…). Sin grupo = nivel superior. */
  grupo?: string;
  /** Contador a la derecha (pendientes, alertas). */
  contador?: number;
};

export type Portal = { id: string; etiqueta: string; href: string };

export type Tenant = { nombre: string };

export type Usuario = { nombre: string; email?: string; rol?: string };

export type LinkProps = {
  href: string;
  className?: string;
  children: ReactNode;
  "aria-current"?: "page" | undefined;
};

/** Componente de enlace inyectado por la app (next/link). Por defecto, <a>. */
export type LinkComponent = ComponentType<LinkProps>;

export const LinkPorDefecto: LinkComponent = ({ href, className, children, ...rest }) => (
  <a href={href} className={className} {...rest}>
    {children}
  </a>
);

export function esActivo(rutaActual: string, href: string): boolean {
  return href === "/"
    ? rutaActual === "/"
    : rutaActual === href || rutaActual.startsWith(`${href}/`);
}

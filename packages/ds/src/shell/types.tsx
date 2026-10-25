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
  /** Fijo al pie de la barra lateral y del riel (Configuración). */
  pie?: boolean;
  /** Etiqueta corta para el riel de iPad y la barra inferior ("Instalac."). */
  corta?: string;
  /** Solo en el riel y la barra inferior (en desktop su contador va en otro ítem). */
  soloCompacto?: boolean;
  /** Solo en la barra lateral de desktop: en el riel no aparece y en teléfono va en "Más". */
  soloAmplio?: boolean;
  /** El contador es una alerta (globo rojo también en el riel y la barra inferior). */
  alerta?: boolean;
};

/** Barra superior en modo detalle: "‹ Cuentas / Logística Andina SpA". */
export type Volver = { href: string; etiqueta: string };

export type Portal = {
  id: string;
  etiqueta: string;
  href: string;
  /** Abreviatura para el selector del riel de iPad (64 px); el nombre completo va en title y aria-label. */
  corta?: string;
};

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

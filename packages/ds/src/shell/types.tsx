import type { LucideIcon } from "lucide-react";
import type { ComponentType, ReactNode } from "react";

export type NavItem = {
  href: string;
  exacta?: boolean;
  /** Prefijo extra bajo el cual el ítem también queda activo, sin que su `href` sea el enlace. Para
   *  fichas que cuelgan de un ítem cuya ruta no las contiene («Hoy» → `/supervisor/personas/:id`) o
   *  para acotar un ítem con `exacta` que aun así cubre un detalle («Empresas» → `/platform/tenants`). */
  activoEn?: string;
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
  /** Fuera de la barra inferior del teléfono: va a "Más" (sigue en el riel y en la barra lateral). */
  fueraInferior?: boolean;
  /** El contador es una alerta (globo rojo también en el riel y la barra inferior). */
  alerta?: boolean;
  /** Punto de no leído sin número, en vez del contador numérico (D5: Inicio en la barra inferior). */
  punto?: boolean;
  /** Área de `NAVEGACION.md` §7 (Brief 05): clave estable del grupo para el acordeón y los fijados;
   *  `grupo` sigue siendo la etiqueta visible. */
  area?: string;
  /** Muestra el pin de fijar al pasar el mouse o con foco de teclado (D3). */
  fijable?: boolean;
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
  "aria-label"?: string;
  title?: string;
  onClick?: (event: React.MouseEvent<HTMLAnchorElement>) => void;
};

/** Componente de enlace inyectado por la app (next/link). Por defecto, <a>. */
export type LinkComponent = ComponentType<LinkProps>;

export const LinkPorDefecto: LinkComponent = ({ href, className, children, ...rest }) => (
  <a href={href} className={className} {...rest}>
    {children}
  </a>
);

export function esActivo(
  rutaActual: string,
  href: string,
  exacta = false,
  activoEn?: string,
): boolean {
  const bajo = (base: string) => rutaActual === base || rutaActual.startsWith(`${base}/`);
  if (activoEn && bajo(activoEn)) return true;
  return exacta || href === "/" ? rutaActual === href : bajo(href);
}

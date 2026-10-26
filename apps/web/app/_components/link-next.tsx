import Link from "next/link";

import type { LinkComponent } from "@opai/ds";

import { EstadoEnlace } from "./estado-enlace";

/**
 * next/link con la firma de enlace del DS (filas, pestañas, enlaces de contenido). Conserva la
 * precarga por defecto de Next (ADR-045) y reporta su navegación pendiente para que el shell marque
 * el riel y el título de destino de inmediato; no cambia el contenido por esqueleto (en filas y
 * pestañas basta el esqueleto de detalle que ya pone cada ficha, sin tocar la lista).
 */
export const LinkNext: LinkComponent = ({ href, className, children, ...rest }) => (
  <Link href={href} className={className} {...rest}>
    {children}
    <EstadoEnlace href={href} />
  </Link>
);

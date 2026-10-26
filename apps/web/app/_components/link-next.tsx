import Link from "next/link";

import type { LinkComponent } from "@opai/ds";

import { EstadoEnlace } from "./estado-enlace";

/**
 * next/link con la firma de enlace del DS (filas, pestañas, enlaces de contenido). Sin prefetch
 * automático (carrera con el clic durante la hidratación, #44) y reporta su navegación pendiente para
 * que la cabecera muestre la barra de progreso (ADR-045); no cambia el contenido por esqueleto (en
 * filas y pestañas basta la barra, sin tocar la lista).
 */
export const LinkNext: LinkComponent = ({ href, className, children, ...rest }) => (
  <Link href={href} className={className} prefetch={false} {...rest}>
    {children}
    <EstadoEnlace href={href} />
  </Link>
);

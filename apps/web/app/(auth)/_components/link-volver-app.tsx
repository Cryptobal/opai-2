"use client";

import Link from "next/link";

import type { LinkComponent } from "@opai/ds";

import { EstadoEnlace } from "@/app/_components/estado-enlace";

/**
 * Vuelta a la app nativa (CAR-727): `prefetch={false}` fijo. Un prefetch de `/app/volver` emitiría
 * el código y borraría la cookie del reto antes del toque en «Seguir en la app OPAI».
 */
export const LinkVolverApp: LinkComponent = ({ href, className, children, ...rest }) => (
  <Link href={href} className={className} prefetch={false} {...rest}>
    {children}
    <EstadoEnlace href={href} />
  </Link>
);
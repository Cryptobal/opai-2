"use client";

import Link from "next/link";

import type { LinkComponent } from "@opai/ds";

import { EstadoEnlace } from "./estado-enlace";

/**
 * Enlaces del menú. Se conserva la precarga por defecto de Next (`prefetch` al estar visibles y al
 * pasar el cursor), como pide ADR-045 (decisión 1: «las rutas del menú se precargan»). El cuelgue de
 * #44 se corrige en la impureza de `marcaGenerado` (ver `lib/epoca-sesion.ts`), no desactivando el
 * prefetch. `EstadoEnlace` reporta la navegación pendiente (el shell marca el riel y el título de
 * destino de inmediato) y, con `conEsqueleto`, cubre con esqueleto la espera del contenido.
 */
export const LinkMenu: LinkComponent = ({ href, className, children, ...rest }) => {
  return (
    <Link href={href} className={className} {...rest}>
      {children}
      <EstadoEnlace href={href} conEsqueleto />
    </Link>
  );
};

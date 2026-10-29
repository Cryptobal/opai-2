"use client";

import Link from "next/link";
import { useState } from "react";

import type { LinkComponent } from "@opai/ds";

import { EstadoEnlace } from "./estado-enlace";

/**
 * Enlace del índice/riel de Configuración. Precarga por intención —al pasar el cursor, tocar o
 * enfocar—, nunca al verse: el índice tiene ~15 secciones y se repinta en cada página de
 * `/configuracion/*`, así que la precarga por defecto de Next disparaba un render completo (y su
 * ráfaga de consultas a Neon) de cada sección al aterrizar, agotando el pool (P2028 del PR #134, B1).
 * Mismo criterio que `LinkMenu`, pero con `prefetch={false}` hasta la intención para cortar también
 * la precarga parcial; el esqueleto lo pone cada sección (`PaginaConfig`), así que no va aquí.
 */
export const LinkIndice: LinkComponent = ({ href, className, children, ...rest }) => {
  const [intencion, setIntencion] = useState(false);
  return (
    <Link
      href={href}
      className={className}
      prefetch={intencion}
      onMouseEnter={() => setIntencion(true)}
      onTouchStart={() => setIntencion(true)}
      onFocus={() => setIntencion(true)}
      {...rest}
    >
      {children}
      <EstadoEnlace href={href} />
    </Link>
  );
};

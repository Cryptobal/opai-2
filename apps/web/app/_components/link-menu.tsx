"use client";

import Link from "next/link";
import { useState } from "react";

import type { LinkComponent } from "@opai/ds";

import { EstadoEnlace } from "./estado-enlace";

/**
 * Enlaces del menú. Al verse siguen con el prefetch parcial de Next; la página completa se precarga
 * por intención —al pasar el cursor, tocar o enfocar— (visita inmediata; decisiones 1 y 3 de ADR-045:
 * «las rutas del menú se precargan» y «prefetch explícito de las entradas del menú»), no antes, para
 * no contar en `core.consumos` lecturas que nadie pidió. `EstadoEnlace` reporta la navegación
 * pendiente (el shell marca el riel y el título de destino de inmediato, sin barra de progreso) y, con
 * `conEsqueleto`, cubre con esqueleto la espera del contenido.
 */
export const LinkMenu: LinkComponent = ({ href, className, children, ...rest }) => {
  const [intencion, setIntencion] = useState(false);
  return (
    <Link
      href={href}
      className={className}
      {...(intencion ? { prefetch: true } : {})}
      onMouseEnter={() => setIntencion(true)}
      onTouchStart={() => setIntencion(true)}
      onFocus={() => setIntencion(true)}
      {...rest}
    >
      {children}
      <EstadoEnlace href={href} conEsqueleto />
    </Link>
  );
};

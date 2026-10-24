"use client";

import Link, { useLinkStatus } from "next/link";
import { useEffect, useState } from "react";

import type { LinkComponent } from "@opai/ds";

/**
 * Hijo invisible de un <Link> del menú: si la navegación sigue pendiente pasado el retraso, marca
 * <html> y el CSS cambia el contenido por el esqueleto (`data-contenido` / `data-esqueleto`, ver
 * globals.css). Una navegación rápida no lo muestra nunca: sin destellos.
 */
let pendientes = 0;

function EstadoEnlace() {
  const { pending } = useLinkStatus();
  useEffect(() => {
    if (!pending) return;
    const raiz = document.documentElement;
    let marcado = false;
    const t = setTimeout(() => {
      marcado = true;
      pendientes++;
      raiz.setAttribute("data-navegando", "");
    }, 200);
    return () => {
      clearTimeout(t);
      if (marcado && --pendientes === 0) raiz.removeAttribute("data-navegando");
    };
  }, [pending]);
  return null;
}

/**
 * Enlaces del menú: precargan la página completa al pasar el cursor o tocar (visita inmediata,
 * ADR-045; no al verse, para no contar como uso lecturas que nadie pidió) y avisan si tardan.
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
      <EstadoEnlace />
    </Link>
  );
};

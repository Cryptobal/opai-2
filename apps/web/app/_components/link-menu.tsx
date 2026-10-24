"use client";

import Link, { useLinkStatus } from "next/link";
import { useEffect } from "react";

import type { LinkComponent } from "@opai/ds";

/**
 * Hijo invisible de un <Link> del menú: si la navegación sigue pendiente pasado el retraso, marca
 * <html> y el CSS cambia el contenido por el esqueleto (`data-contenido` / `data-esqueleto`, ver
 * globals.css). Una navegación rápida no lo muestra nunca: sin destellos.
 */
function EstadoEnlace() {
  const { pending } = useLinkStatus();
  useEffect(() => {
    if (!pending) return;
    const raiz = document.documentElement;
    const t = setTimeout(() => raiz.setAttribute("data-navegando", ""), 200);
    return () => {
      clearTimeout(t);
      raiz.removeAttribute("data-navegando");
    };
  }, [pending]);
  return null;
}

/** Enlaces del menú: precargan la página completa (visita inmediata, ADR-045) y avisan si tardan. */
export const LinkMenu: LinkComponent = ({ href, className, children, ...rest }) => (
  <Link href={href} className={className} prefetch {...rest}>
    {children}
    <EstadoEnlace />
  </Link>
);

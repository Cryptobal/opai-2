"use client";

import Link from "next/link";
import type { MouseEvent, ReactNode } from "react";

import { cn, estilosBoton } from "@opai/ds";

import { urlConHoja } from "@/lib/hoja-url";

/**
 * Botón que abre una hoja de la misma página (`?convertir=1`) sin pedirle la página al servidor: la
 * hoja ya está montada y solo necesita el parámetro en la URL. Con un `Link` normal, cada apertura
 * volvía a cargar lista, ficha y acciones, y un fallo puntual de esa carga reemplazaba la ficha por
 * un error hasta recargar (CAR-209). Sigue siendo un enlace: clic con modificador, clic medio y
 * «abrir en pestaña nueva» usan el `href`.
 */
export function EnlaceHoja({
  param,
  href,
  children,
  variante = "primary",
  className,
}: {
  param: string;
  href: string;
  children: ReactNode;
  variante?: "primary" | "secondary" | "ghost";
  className?: string;
}) {
  function alClic(e: MouseEvent<HTMLAnchorElement>) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    history.pushState(null, "", urlConHoja(location.href, param));
  }
  return (
    <Link
      href={href}
      prefetch={false}
      onClick={alClic}
      className={cn(estilosBoton({ variant: variante }), className)}
    >
      {children}
    </Link>
  );
}

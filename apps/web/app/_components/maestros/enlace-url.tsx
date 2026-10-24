"use client";

import Link from "next/link";
import type { ComponentProps } from "react";

/**
 * Enlace que solo cambia el parámetro de la URL de la misma página (`?nueva=1`, `?subir=1`): abre
 * la hoja al instante con el historial del navegador, sin esperar a que el servidor vuelva a
 * renderizar la página (en frío eso tarda segundos y la hoja parecía no abrir). Mantiene el
 * `href` real: clic con modificador, "abrir en pestaña nueva" y sin JavaScript navegan normal.
 */
export function EnlaceUrl({ href, ...props }: Omit<ComponentProps<typeof Link>, "href"> & { href: string }) {
  return (
    <Link
      href={href}
      onClick={(e) => {
        const [ruta = "", consulta] = href.split("?");
        const otra = e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey;
        if (consulta === undefined || (ruta && ruta !== location.pathname) || otra) return;
        e.preventDefault();
        history.pushState(null, "", `${location.pathname}?${consulta}`);
      }}
      {...props}
    />
  );
}

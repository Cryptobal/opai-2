"use client";

import { useLinkStatus } from "next/link";
import { useEffect } from "react";

import { ESPERA_ESQUELETO_MS } from "@/lib/cache-navegador";

import { fijarPendiente, limpiarPendiente } from "./navegacion-pendiente";

let pendientes = 0;

/**
 * Hijo invisible de un <Link>: mientras su navegación está pendiente reporta el destino al almacén de
 * navegación pendiente (el shell marca el riel y pone el título de destino de inmediato, ADR-045; sin
 * barra de progreso, decisión 1). Con `conEsqueleto`, además marca <html data-navegando> pasado el
 * retraso para que el CSS cambie el contenido por el esqueleto (solo en los enlaces del menú, donde
 * cambia toda la página; en filas y pestañas la ficha ya pone su propio esqueleto, sin tocar la lista).
 */
export function EstadoEnlace({ href, conEsqueleto = false }: { href: string; conEsqueleto?: boolean }) {
  const { pending } = useLinkStatus();
  useEffect(() => {
    if (!pending) return;
    fijarPendiente(href);
    const raiz = document.documentElement;
    let marcado = false;
    const t = conEsqueleto
      ? setTimeout(() => {
          marcado = true;
          pendientes++;
          raiz.setAttribute("data-navegando", "");
        }, ESPERA_ESQUELETO_MS)
      : undefined;
    return () => {
      if (t) clearTimeout(t);
      limpiarPendiente(href);
      if (marcado && --pendientes === 0) raiz.removeAttribute("data-navegando");
    };
  }, [pending, href, conEsqueleto]);
  return null;
}

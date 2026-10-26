"use client";

import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect } from "react";

import { type Cabecera, fijarCabecera } from "./cabecera-contexto";
import { useRefrescoSilencioso } from "./refresco-navegador";

// En el cliente, antes de pintar (sin parpadeo al navegar); en el servidor no corre (evita el aviso).
const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/**
 * Fija el título y las acciones de la página en el shell persistente del layout (ADR-045) y arranca
 * el refresco silencioso de esta página. No pinta nada: la barra superior del shell lee la cabecera
 * del almacén. Corre en cada render para que la barra siempre refleje la página actual; como el
 * almacén vive fuera de React, fijarla no re-renderiza la página (no hay bucle).
 */
export function CabeceraPagina({
  generado,
  epoca,
  ...cabecera
}: Cabecera & { generado: number; epoca: string }) {
  const ruta = usePathname();
  useIsoLayoutEffect(() => {
    fijarCabecera(cabecera);
  });
  useRefrescoSilencioso(generado, ruta, epoca);
  return null;
}

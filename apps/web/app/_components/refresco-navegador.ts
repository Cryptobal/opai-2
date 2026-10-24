"use client";

import { useRouter } from "next/navigation";
import { startTransition, useEffect } from "react";

import { REFRESCO_SILENCIOSO_S } from "@/lib/cache-navegador";

// --- Refresco silencioso -------------------------------------------------------------------
// Una página que vino de la caché del navegador y es más vieja que REFRESCO_SILENCIOSO_S se vuelve
// a pedir en segundo plano, sin esqueleto. La edad se mide desde que el SERVIDOR generó el dato
// (`generado`), no desde que se muestra: una página precargada hace rato sale ya «vieja». Para
// comparar con el reloj del navegador se calcula una vez el desfase entre ambos relojes con la
// primera página del documento (recién servida); así hay una sola línea de tiempo.
const EDAD_MAXIMA_MS = REFRESCO_SILENCIOSO_S * 1000;
let desfaseMs: number | null = null;
// Última vez que se refrescó cada ruta, por época (usuario + empresa): la clave no se repite entre
// rutas ni entre empresas.
const ultimoRefresco = new Map<string, number>();

export function useRefrescoSilencioso(generado: number, ruta: string, epoca: string) {
  const router = useRouter();
  useEffect(() => {
    const ahora = Date.now();
    if (desfaseMs === null) {
      desfaseMs = ahora - generado;
      return;
    }
    if (ahora - generado - desfaseMs < EDAD_MAXIMA_MS) return;
    const clave = `${epoca}|${ruta}`;
    if (ahora - (ultimoRefresco.get(clave) ?? 0) < EDAD_MAXIMA_MS) return;
    ultimoRefresco.set(clave, ahora);
    startTransition(() => router.refresh());
  }, [generado, ruta, epoca, router]);
}

// --- Época de sesión entre pestañas --------------------------------------------------------
const CANAL = "opai-sesion";
/** Época de una página sin sesión (login, invitación sin sesión). */
export const EPOCA_ANONIMA = "anonimo";

/** Publica la época de ESTA página (ya renderizada tras el cambio de sesión o de empresa). */
function publicar(epoca: string) {
  try {
    const c = new BroadcastChannel(CANAL);
    c.postMessage(epoca);
    c.close();
  } catch {
    // Sin BroadcastChannel las otras pestañas se ponen al día al vencer la caché.
  }
}

/**
 * Cada página con sesión (o sin ella) anuncia su época al montarse, que es DESPUÉS del cambio (la
 * cookie ya cambió y la página se renderizó con ella). Otra pestaña con una época distinta recarga
 * al instante, sin esperas fijas. `null`: la página no publica ni escucha.
 */
export function useEpocaSesion(propia: string | null) {
  useEffect(() => {
    if (propia === null || typeof BroadcastChannel === "undefined") return;
    publicar(propia);
    const c = new BroadcastChannel(CANAL);
    c.onmessage = (e: MessageEvent<unknown>) => {
      if (typeof e.data === "string" && e.data !== propia) window.location.reload();
    };
    return () => c.close();
  }, [propia]);
}

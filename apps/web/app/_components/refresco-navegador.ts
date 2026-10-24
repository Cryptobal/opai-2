"use client";

import { useRouter } from "next/navigation";
import { startTransition, useEffect } from "react";

// Refresco silencioso: una página que vino de la caché del navegador (el navegador la recibió hace
// más de 15 s) se vuelve a pedir en segundo plano, sin esqueleto. La edad se mide con el reloj del
// navegador desde que vio por primera vez esa versión (`generado` solo identifica la versión), así
// un reloj desfasado no provoca refrescos de más. Parte del tope de 5 min de `staleTimes` (ADR-045).
const EDAD_MAXIMA_MS = 15_000;
const vistaPrimeraVez = new Map<number, number>();
const ultimoRefresco = new Map<string, number>();

export function useRefrescoSilencioso(generado: number, ruta: string) {
  const router = useRouter();
  useEffect(() => {
    const ahora = Date.now();
    const vista = vistaPrimeraVez.get(generado) ?? ahora;
    vistaPrimeraVez.set(generado, vista);
    if (vistaPrimeraVez.size > 200) vistaPrimeraVez.delete(vistaPrimeraVez.keys().next().value ?? 0);
    if (ahora - vista < EDAD_MAXIMA_MS) return;
    if (ahora - (ultimoRefresco.get(ruta) ?? 0) < EDAD_MAXIMA_MS) return;
    ultimoRefresco.set(ruta, ahora);
    startTransition(() => router.refresh());
  }, [generado, ruta, router]);
}

const RETRASO_MS = 1200;
const CANAL = "opai-sesion";
// Cada pestaña se identifica: el aviso no debe recargar a la que lo envía (su Server Action sigue).
const ESTA_PESTANA = Math.random().toString(36).slice(2);

/** Avisa a las otras pestañas que cambió la sesión o la empresa: su caché ya no vale. */
export function avisarCambioSesion() {
  try {
    const c = new BroadcastChannel(CANAL);
    c.postMessage(ESTA_PESTANA);
    c.close();
  } catch {
    // Sin BroadcastChannel las otras pestañas se ponen al día al vencer la caché (5 min).
  }
}

/** Recarga esta pestaña cuando otra cambia de sesión o de empresa. */
export function useCambioSesionExterno() {
  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    const c = new BroadcastChannel(CANAL);
    c.onmessage = (e: MessageEvent<unknown>) => {
      // El aviso sale antes de que la Server Action termine: se espera a que la sesión cambie.
      if (e.data !== ESTA_PESTANA) setTimeout(() => window.location.reload(), RETRASO_MS);
    };
    return () => c.close();
  }, []);
}

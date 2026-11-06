"use client";

import { encolarHecho, leerCola, leerEstadoEnvio, pedirEnvio } from "./cola";

/**
 * Estado de Terreno en el teléfono, como almacén externo (`useSyncExternalStore`): conexión, hechos por
 * enviar y último intento. Lo alimentan los eventos del navegador y los mensajes del service worker.
 */
export type EstadoTerreno = {
  enLinea: boolean;
  pendientes: number;
  sincronizando: boolean;
  error: string | null;
};

const INICIAL: EstadoTerreno = { enLinea: true, pendientes: 0, sincronizando: false, error: null };
const CLAVE_LATIDO = "opai.terreno.ultimoLatido";
const CADA_LATIDO_MS = 5 * 60_000;
export const VERSION_APP = "terreno-web-1";

let estado = INICIAL;
let iniciado = false;
const oyentes = new Set<() => void>();

function poner(parcial: Partial<EstadoTerreno>) {
  estado = { ...estado, ...parcial };
  oyentes.forEach((f) => f());
}

async function refrescar() {
  const [cola, ultimo] = await Promise.all([
    leerCola().catch(() => []),
    leerEstadoEnvio().catch(() => null),
  ]);
  poner({
    pendientes: cola.length,
    sincronizando: cola.length > 0 && estado.enLinea && ultimo?.ok !== false,
    error: cola.length > 0 && ultimo?.ok === false ? (ultimo.error ?? null) : null,
  });
}

/** Un latido (el equipo avisa que estuvo activo) como mucho cada 5 minutos, con o sin conexión. */
export async function latidoSiCorresponde(personaId: string | null): Promise<void> {
  const ultimo = Number(localStorage.getItem(CLAVE_LATIDO) ?? 0);
  if (Date.now() - ultimo < CADA_LATIDO_MS) return;
  localStorage.setItem(CLAVE_LATIDO, String(Date.now()));
  await encolarHecho({ tipo: "terreno.latido", payload: { version: VERSION_APP }, personaId });
  await refrescar();
}

function iniciar() {
  if (iniciado || typeof window === "undefined") return;
  iniciado = true;
  estado = { ...estado, enLinea: navigator.onLine };
  window.addEventListener("online", () => {
    poner({ enLinea: true });
    void pedirEnvio().then(refrescar);
  });
  window.addEventListener("offline", () => poner({ enLinea: false, sincronizando: false }));
  navigator.serviceWorker?.addEventListener("message", (e: MessageEvent) => {
    if (e.data?.type === "COLA") void refrescar();
  });
  void refrescar();
}

export const suscribir = (f: () => void) => {
  iniciar();
  oyentes.add(f);
  return () => {
    oyentes.delete(f);
  };
};
export const instantanea = () => estado;
export const instantaneaServidor = () => INICIAL;
export { refrescar as refrescarEstado };

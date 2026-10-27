"use client";

import { Toaster } from "@opai/ds";

import { ClientePwa } from "./pwa/cliente-pwa";

/**
 * Capa cliente diferida del shell (se monta con `ssr: false`, tras hidratar): los avisos (sonner) y
 * el aviso de versión nueva de la PWA (ADR-044 R2). Viaja en este chunk, así no pesa en el primer JS
 * de ninguna ruta de portal (ADR-037). El registro del service worker ya corre en toda la app por el
 * script del layout raíz.
 */
export function Avisos() {
  return (
    <>
      <Toaster />
      <ClientePwa />
    </>
  );
}

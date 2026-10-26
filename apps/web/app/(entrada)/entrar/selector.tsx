"use client";

import { Button, type Portal } from "@opai/ds";

/** Cookie con el portal elegido en la entrada, guardada solo en este dispositivo (D1 del Brief 04). */
export const COOKIE_PORTAL = "opai_portal";

/** Guarda la elección en el dispositivo y navega al portal. Fuera del componente: la escritura de
 *  la cookie es un efecto sobre el DOM, no estado de React. */
function entrar(portal: Portal): void {
  document.cookie = `${COOKIE_PORTAL}=${portal.id}; path=/; max-age=31536000; samesite=lax`;
  window.location.assign(portal.href);
}

/** Selector de portal de la entrada: recuerda la elección en el dispositivo (cookie, sin base ni
 *  auditoría por navegación) y navega al portal. Botones del DS (ADR-017). */
export function SelectorPortal({ portales }: { portales: readonly Portal[] }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-6 p-6">
      <div>
        <h1 className="t-title text-fg">Entrar a OPAI</h1>
        <p className="mt-1 text-base text-fg-muted">Elige con qué portal quieres entrar.</p>
      </div>
      <div className="flex flex-col gap-2">
        {portales.map((portal) => (
          <Button
            key={portal.id}
            variant="secondary"
            block
            size="lg"
            onClick={() => entrar(portal)}
          >
            {portal.etiqueta}
          </Button>
        ))}
      </div>
    </main>
  );
}

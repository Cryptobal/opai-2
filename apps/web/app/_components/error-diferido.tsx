"use client";

import { lazy, Suspense } from "react";

import type { PropsError } from "./pantalla-error";

// La pantalla de error (ErrorState, Forbidden y el botón del DS) se descarga solo cuando hay un error:
// el límite está en todas las rutas y no debe pesar en su JavaScript inicial (ADR-037).
const PantallaError = lazy(() =>
  import("./pantalla-error").then((m) => ({ default: m.PantallaError })),
);

/** Lo que renderiza cada `error.tsx` (CAR-50); mientras llega la pantalla, un aviso en texto. */
export function ErrorDiferido(props: PropsError) {
  return (
    <Suspense
      fallback={
        <p role="alert" className="t-body py-12 text-center text-fg-muted">
          No pudimos cargar esta página.
        </p>
      }
    >
      <PantallaError {...props} />
    </Suspense>
  );
}

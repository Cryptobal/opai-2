"use client";

import { lazy, Suspense } from "react";

import { Loading } from "@opai/ds";

import type { AjustesFlujo, FilaFlujo } from "@/app/(erp)/finanzas/flujo/_componentes/datos";

// El editor se descarga aparte: el tope de JS de la ruta es ajustado (ADR-037).
const EditorFlujoCaja = lazy(() =>
  import("./editor-flujo-caja").then((m) => ({ default: m.EditorFlujoCaja })),
);

export function EditorFlujoCajaDiferido({
  filas,
  ajustes,
}: {
  filas: FilaFlujo[];
  ajustes: AjustesFlujo;
}) {
  return (
    <Suspense fallback={<Loading variante="formulario" />}>
      <EditorFlujoCaja filas={filas} ajustes={ajustes} />
    </Suspense>
  );
}

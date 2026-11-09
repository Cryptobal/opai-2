"use client";

import { lazy, Suspense } from "react";

import { Loading } from "@opai/ds";

import type { CicloTurno, EsquemaCobertura } from "./esquemas-tipos";

const Editable = lazy(() => import("./esquemas-editable").then((m) => ({ default: m.EsquemasEditable })));

/** La lista y su hoja se cargan aparte para no sumar JS de entrada a Configuración (ADR-037). */
export function EsquemasDiferido(props: { esquemas: readonly EsquemaCobertura[]; ciclos: readonly CicloTurno[]; editable: boolean }) {
  return (
    <Suspense fallback={<Loading variante="formulario" />}>
      <Editable {...props} />
    </Suspense>
  );
}

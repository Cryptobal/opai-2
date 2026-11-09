"use client";

import { lazy, Suspense } from "react";

import { Loading } from "@opai/ds";

import type { ItemPredefinido } from "./costos-predefinidos-editable";

const Editable = lazy(() => import("./costos-predefinidos-editable").then((m) => ({ default: m.CostosPredefinidosEditable })));

/** Se carga aparte para no sumar JS de entrada a Configuración (ADR-037). */
export function CostosPredefinidosDiferido(props: { items: readonly ItemPredefinido[]; categorias: readonly { id: string; nombre: string }[]; editable: boolean }) {
  return (
    <Suspense fallback={<Loading variante="formulario" />}>
      <Editable {...props} />
    </Suspense>
  );
}

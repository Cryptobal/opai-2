"use client";

import { lazy, Suspense } from "react";

import { Loading } from "@opai/ds";

import type { Etapa } from "../_componentes/hojas/tipos";

const EditorEmbudo = lazy(() =>
  import("./editor-embudo").then((m) => ({ default: m.EditorEmbudo })),
);

export function EditorEmbudoDiferido({ etapas }: { etapas: Etapa[] }) {
  return (
    <Suspense fallback={<Loading variante="formulario" />}>
      <EditorEmbudo etapas={etapas} />
    </Suspense>
  );
}

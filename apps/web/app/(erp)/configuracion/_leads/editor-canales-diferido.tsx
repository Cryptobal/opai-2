"use client";

import { lazy, Suspense } from "react";

import { Loading } from "@opai/ds";

import type { CanalConfig } from "./editor-canales";

const EditorCanales = lazy(() =>
  import("./editor-canales").then((m) => ({ default: m.EditorCanales })),
);

export function EditorCanalesDiferido({ canales }: { canales: CanalConfig[] }) {
  return (
    <Suspense fallback={<Loading variante="formulario" />}>
      <EditorCanales canales={canales} />
    </Suspense>
  );
}

"use client";

import { lazy, Suspense } from "react";

import { Loading } from "@opai/ds";

const FormPlantillaDocumento = lazy(() =>
  import("./form-plantilla-documento").then((m) => ({ default: m.FormPlantillaDocumento })),
);

export function FormPlantillaDocumentoDiferido({
  plantilla,
}: {
  plantilla: {
    version: number;
    base: string;
    bloques: { id: string; activo: boolean }[];
    basesDisponibles: string[];
  };
}) {
  return (
    <Suspense fallback={<Loading variante="formulario" />}>
      <FormPlantillaDocumento plantilla={plantilla} />
    </Suspense>
  );
}

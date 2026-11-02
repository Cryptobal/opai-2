"use client";

import { lazy, Suspense } from "react";

import { Loading } from "@opai/ds";

const FormPlantillaPropuesta = lazy(() =>
  import("./form-plantilla-propuesta").then((m) => ({ default: m.FormPlantillaPropuesta })),
);

export function FormPlantillaPropuestaDiferido({
  plantilla,
}: {
  plantilla: {
    version: number;
    base: string;
    nombreVisible: string;
    aperturaMaxima: string;
    bloques: { id: string; activo: boolean; fijo: boolean; opcional: boolean }[];
    basesDisponibles: string[];
  };
}) {
  return (
    <Suspense fallback={<Loading variante="formulario" />}>
      <FormPlantillaPropuesta plantilla={plantilla} />
    </Suspense>
  );
}

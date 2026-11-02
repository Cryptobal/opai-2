"use client";

import { lazy, Suspense } from "react";

import { Loading } from "@opai/ds";

const FormMarcaDocumento = lazy(() =>
  import("./form-marca-documento").then((m) => ({ default: m.FormMarcaDocumento })),
);

export function FormMarcaDocumentoDiferido({
  marca,
}: {
  marca: {
    tipografia: string;
    piePagina: string | null;
    condicionesDefault: string | null;
  };
}) {
  return (
    <Suspense fallback={<Loading variante="formulario" />}>
      <FormMarcaDocumento marca={marca} />
    </Suspense>
  );
}

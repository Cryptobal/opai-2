import { type ReactNode, Suspense } from "react";

import { Loading, SplitScreen } from "@opai/ds";

/** Ficha de inventario: lista a la izquierda y la ficha (que carga aparte) a la derecha; en teléfono, la ficha. */
export function FichaDividida({
  etiquetaLista,
  lista,
  children,
}: {
  etiquetaLista: string;
  lista: ReactNode;
  children: ReactNode;
}) {
  return (
    <SplitScreen
      telefono="detalle"
      unPanelHastaLg
      etiquetaLista={etiquetaLista}
      lista={lista}
      detalle={<Suspense fallback={<Loading variante="detalle" />}>{children}</Suspense>}
    />
  );
}

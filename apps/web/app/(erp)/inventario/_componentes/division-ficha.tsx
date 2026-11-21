import { type ReactNode, Suspense } from "react";

import { Loading, SplitScreen } from "@opai/ds";

/** Ficha de Inventario: la lista a la izquierda y la ficha a la derecha (sin esperarla); en teléfono, la ficha. */
export function DivisionFicha({ etiqueta, lista, children }: { etiqueta: string; lista: ReactNode; children: ReactNode }) {
  return (
    <SplitScreen
      telefono="detalle"
      unPanelHastaLg
      etiquetaLista={etiqueta}
      lista={lista}
      detalle={<Suspense fallback={<Loading variante="detalle" />}>{children}</Suspense>}
    />
  );
}

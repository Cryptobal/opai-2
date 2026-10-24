"use client";

import { lazy, Suspense } from "react";

const Efecto = lazy(() => import("./realce-barra-efecto"));

/** Carga aparte el realce de `BarraTabs`: la barra se pinta sin esperarlo. */
export function RealceBarra({ activa }: { activa: string }) {
  return (
    <Suspense>
      <Efecto activa={activa} />
    </Suspense>
  );
}

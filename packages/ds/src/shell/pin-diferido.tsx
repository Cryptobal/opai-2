"use client";

import { lazy, Suspense } from "react";
import type { ComponentProps } from "react";
import type { BotonFijar } from "./boton-fijar";

const Pin = lazy(() => import("./boton-fijar").then((m) => ({ default: m.BotonFijar })));

/** Los controles de fijados se montan cuando llegan las preferencias, no con el menú inicial. */
export function PinDiferido(props: ComponentProps<typeof BotonFijar>) {
  return <Suspense fallback={null}><Pin {...props} /></Suspense>;
}

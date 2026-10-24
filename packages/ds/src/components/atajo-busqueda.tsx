"use client";

import { useSyncExternalStore } from "react";

import { Kbd } from "./segmentado";

const sinSuscripcion = () => () => undefined;

/** `true` en macOS/iOS; en el servidor y antes de hidratar es `false` (Ctrl). */
function useEsMac() {
  return useSyncExternalStore(
    sinSuscripcion,
    () => /Mac|iPhone|iPad/i.test(navigator.platform || navigator.userAgent),
    () => false,
  );
}

/** Atajo de la búsqueda global: «⌘K» en Mac y «Ctrl K» en el resto (el shell escucha ambas). */
export function AtajoBusqueda() {
  return <Kbd>{useEsMac() ? "⌘K" : "Ctrl K"}</Kbd>;
}

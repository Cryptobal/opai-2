"use client";

import { createContext, type ReactNode, useContext } from "react";

const SoloLectura = createContext(false);

/** En «ver como» (CAR-528) los botones que guardan se ven, pero desactivados; el servidor igual rechaza. */
export function SoloLecturaVerComo({ children }: { children: ReactNode }) {
  return <SoloLectura.Provider value>{children}</SoloLectura.Provider>;
}

export const useSoloLectura = () => useContext(SoloLectura);

"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";

import { MarcoShell } from "./marco-shell";
import type { DatosShell } from "./tipos-shell";

// El marco Hilo (ADR-090) va en su propio trozo de JS: quien usa el clásico no lo descarga. Se carga
// desde un componente de cliente porque `next/dynamic` en el layout de servidor rompe la validación
// del render instantáneo de Cache Components.
const MarcoHilo = dynamic(() => import("./hilo/marco-hilo").then((m) => m.MarcoHilo));

type Props = { hilo: boolean; datos: DatosShell; children: ReactNode };

/** Monta el marco elegido por la persona con las mismas páginas y los mismos datos del shell. */
export function MarcoPortal({ hilo, datos, children }: Props) {
  return hilo ? (
    <MarcoHilo datos={datos}>{children}</MarcoHilo>
  ) : (
    <MarcoShell datos={datos}>{children}</MarcoShell>
  );
}

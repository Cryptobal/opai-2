"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";

import { MarcoShell } from "./marco-shell";
import type { DatosShell } from "./tipos-shell";
import type { Marco } from "@/lib/marco";

// El marco Hilo (ADR-090) va en su propio trozo de JS: quien usa el clásico no lo descarga. Se carga
// desde un componente de cliente porque `next/dynamic` en el layout de servidor rompe la validación
// del render instantáneo de Cache Components.
const MarcoHilo = dynamic(() => import("./hilo/marco-hilo").then((m) => m.MarcoHilo));

type Props = { marco: Marco; datos: DatosShell; children: ReactNode };

/**
 * Monta el marco elegido por la persona con las mismas páginas y los mismos datos del shell. El diseño
 * nuevo (ADR-109) usa el mismo shell que el clásico, con su piel y su menú plegable.
 */
export function MarcoPortal({ marco, datos, children }: Props) {
  if (marco === "hilo") return <MarcoHilo datos={datos}>{children}</MarcoHilo>;
  return (
    <MarcoShell datos={datos} nuevo={marco === "nuevo"}>
      {children}
    </MarcoShell>
  );
}

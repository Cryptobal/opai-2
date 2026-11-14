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
const MarcoNuevo = dynamic(() => import("./marco-nuevo").then((m) => m.MarcoNuevo));

type Props = {
  marco: Marco;
  menuPlegado?: boolean;
  /** Ancho del menú lateral guardado en este navegador (CAR-442). */
  menuAncho?: number;
  datos: DatosShell;
  children: ReactNode;
};

/**
 * Monta el marco elegido por la persona con las mismas páginas y los mismos datos del shell. El diseño
 * nuevo (ADR-109) usa el mismo shell que el clásico, con su piel y su menú plegable.
 */
export function MarcoPortal({ marco, menuPlegado = false, menuAncho, datos, children }: Props) {
  if (marco === "hilo") return <MarcoHilo datos={datos}>{children}</MarcoHilo>;
  if (marco === "nuevo")
    return (
      <MarcoNuevo datos={datos} menuPlegado={menuPlegado} {...(menuAncho ? { menuAncho } : {})}>
        {children}
      </MarcoNuevo>
    );
  return <MarcoShell datos={datos}>{children}</MarcoShell>;
}

"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";

import { MarcoShell } from "./marco-shell";
import type { DatosShell } from "./tipos-shell";
import type { Marco } from "@/lib/marco";

// El diseño nuevo va en su propio trozo de JS: quien está sin empresa (marco base) no lo descarga.
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
 * Monta el marco de la persona con las mismas páginas y los mismos datos del shell. Con empresa es
 * siempre el diseño nuevo (ADR-109); sin empresa, el marco base.
 */
export function MarcoPortal({ marco, menuPlegado = false, menuAncho, datos, children }: Props) {
  if (marco === "nuevo")
    return (
      <MarcoNuevo datos={datos} menuPlegado={menuPlegado} {...(menuAncho ? { menuAncho } : {})}>
        {children}
      </MarcoNuevo>
    );
  return <MarcoShell datos={datos}>{children}</MarcoShell>;
}

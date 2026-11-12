"use client";

import type { ReactNode } from "react";

import { ShellNuevo } from "@opai/ds/shell-nuevo";

import { useAcentoEmpresa } from "./acento-empresa";
import { MarcoShell } from "./marco-shell";
import type { DatosShell } from "./tipos-shell";

/**
 * Marco del diseño nuevo (ADR-109, CAR-335 D2): el mismo shell del clásico con `ShellNuevo` (piel y
 * menú plegable) y el color de la empresa como acento. Va en su propio trozo de JS, como Hilo.
 */
export function MarcoNuevo({ datos, children }: { datos: DatosShell; children: ReactNode }) {
  const enErp = datos.portal === "erp" && datos.tenant !== null && datos.acceso;
  useAcentoEmpresa(enErp, datos.portal, datos.epoca);
  return (
    <MarcoShell datos={datos} Shell={ShellNuevo}>
      {children}
    </MarcoShell>
  );
}

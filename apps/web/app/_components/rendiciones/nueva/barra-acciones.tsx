import type { ReactNode } from "react";

import { AccionFijaTelefono } from "@opai/ds";

/** Acciones al pie: fijas sobre la barra inferior en teléfono y en línea, a la derecha, desde md. */
export function BarraAcciones({ children }: { children: ReactNode }) {
  return (
    <>
      <AccionFijaTelefono compacto={false}>
        <div className="flex flex-col gap-2">{children}</div>
      </AccionFijaTelefono>
      <div className="mt-6 hidden justify-end gap-2 md:flex">{children}</div>
    </>
  );
}

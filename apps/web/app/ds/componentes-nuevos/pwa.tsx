"use client";

import { SinConexion } from "@opai/ds";

/** Estados de la base PWA (ADR-044, Brief 04). El aviso de versión nueva y el de instalar se
 *  agregan en el bloque 3. */
export function MuestraPwa() {
  return (
    <div className="flex flex-col gap-4">
      <SinConexion accion={<span className="text-sm text-fg-muted">[botón Reintentar]</span>} />
    </div>
  );
}

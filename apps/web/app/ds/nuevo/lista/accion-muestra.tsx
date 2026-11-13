"use client";

import { Button } from "@opai/ds";
import { useSeleccion } from "@opai/ds/seleccion";

/** Acción masiva de ejemplo: en una pantalla real llama a su capacidad con los ids elegidos. */
export function AccionMuestra() {
  const s = useSeleccion();
  return (
    <Button variant="secondary" onClick={s.limpiar} data-testid="accion-muestra">
      {`Archivar ${s.ids.length}`}
    </Button>
  );
}

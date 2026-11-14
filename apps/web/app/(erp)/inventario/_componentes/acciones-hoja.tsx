"use client";

import { Button } from "@opai/ds";

/** Botones al pie de las hojas de Inventario: Cancelar y la acción principal con su estado de carga. */
export function AccionesHoja({
  onCancelar,
  onGuardar,
  listo,
  pendiente,
  texto,
}: {
  onCancelar: () => void;
  onGuardar: () => void;
  listo: boolean;
  pendiente: boolean;
  texto: string;
}) {
  return (
    <>
      <Button variant="secondary" onClick={onCancelar}>
        Cancelar
      </Button>
      <Button disabled={pendiente || !listo} onClick={onGuardar}>
        {pendiente ? "Guardando…" : texto}
      </Button>
    </>
  );
}

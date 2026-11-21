"use client";

import { Button } from "@opai/ds";

export function AccionesEditorConfig({
  instalacionId,
  personalizada,
  pendiente,
  onHeredar,
  onGuardar,
}: {
  instalacionId?: string;
  personalizada: boolean;
  pendiente: boolean;
  onHeredar: () => void;
  onGuardar: () => void;
}) {
  return (
    <div className="flex flex-wrap justify-end gap-2">
      {instalacionId && personalizada ? (
        <Button variant="ghost" disabled={pendiente} onClick={() => void onHeredar()}>
          Volver a la de la empresa
        </Button>
      ) : null}
      <Button disabled={pendiente} onClick={() => void onGuardar()}>
        {pendiente ? "Guardando…" : "Guardar configuración"}
      </Button>
    </div>
  );
}
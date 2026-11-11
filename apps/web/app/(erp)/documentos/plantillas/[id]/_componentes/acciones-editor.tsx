"use client";

import { Button } from "@opai/ds";

import type { useEditorPlantilla } from "./use-editor";

/** «Guardar borrador» y «Publicar versión» (md+; en el teléfono no se edita). */
export function AccionesEditor({ e }: { e: ReturnType<typeof useEditorPlantilla> }) {
  return (
    <div className="hidden gap-2 md:flex">
      <Button variant="secondary" disabled={e.pendiente || !e.hayCambios} onClick={e.guardar}>
        Guardar borrador
      </Button>
      <Button disabled={!e.puedePublicar} onClick={e.publicar}>
        Publicar versión
      </Button>
    </div>
  );
}

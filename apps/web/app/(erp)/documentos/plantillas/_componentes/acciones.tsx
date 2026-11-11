import { Upload } from "lucide-react";

import { Alerta, Button } from "@opai/ds";

import { NuevaPlantilla } from "./nueva-plantilla";

/**
 * «Importar Word o PDF» y «Nueva plantilla» del diseño 05. Importar sigue deshabilitado (encargo 09,
 * decisión 9 de Carlos, 9-nov-2026); «Nueva plantilla» abre el editor (06). En el teléfono no se editan.
 */
export function BotonesPlantillas() {
  return (
    <div className="hidden gap-2 md:flex">
      <Button variant="secondary" disabled>
        <Upload aria-hidden className="size-4" />
        Importar Word o PDF
      </Button>
      <NuevaPlantilla />
    </div>
  );
}

export function AvisoPlantillas({ conPlantillas }: { conPlantillas: boolean }) {
  return (
    <div className="mb-3 flex flex-col gap-3">
      <Alerta
        tono="info"
        titulo="Importar Word o PDF llega más adelante"
        className="hidden md:flex"
      >
        Por ahora crea la plantilla con «Nueva plantilla» y pega o escribe el texto en el editor.
      </Alerta>
      {conPlantillas ? (
        <Alerta tono="info" titulo="Edita en un computador" className="md:hidden">
          En el teléfono puedes revisar las plantillas, pero no editarlas.
        </Alerta>
      ) : null}
    </div>
  );
}

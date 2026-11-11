import { Plus, Upload } from "lucide-react";

import { Alerta, Button } from "@opai/ds";

/**
 * «Importar Word o PDF» y «Nueva plantilla» del diseño 05. Ambos quedan deshabilitados con aviso:
 * importar es el encargo 09 (decisión 9 de Carlos, 9-nov-2026) y crear desde la pantalla llega con el
 * editor (06). Las plantillas ya se pueden crear por la API y el MCP. En el teléfono no se editan.
 */
export function BotonesPlantillas() {
  return (
    <div className="hidden gap-2 md:flex">
      <Button variant="secondary" disabled>
        <Upload aria-hidden className="size-4" />
        Importar Word o PDF
      </Button>
      <Button disabled>
        <Plus aria-hidden className="size-4" />
        Nueva plantilla
      </Button>
    </div>
  );
}

export function AvisoPlantillas({ conPlantillas }: { conPlantillas: boolean }) {
  return (
    <div className="mb-3 flex flex-col gap-3">
      <Alerta tono="info" titulo="Importar Word o PDF llega más adelante">
        Crear plantillas desde la pantalla llega con el editor. Mientras tanto se crean por la API y
        el asistente.
      </Alerta>
      {conPlantillas ? (
        <Alerta tono="info" titulo="Edita en un computador" className="md:hidden">
          En el teléfono puedes revisar las plantillas, pero no editarlas.
        </Alerta>
      ) : null}
    </div>
  );
}

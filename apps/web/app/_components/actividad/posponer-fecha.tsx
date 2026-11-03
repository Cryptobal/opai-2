"use client";

import { useState } from "react";

import { instanteEnZona } from "@opai/domain";
import { Button, Campo, Dialog, InputFecha } from "@opai/ds";

/** Diálogo «Posponer tarea» con fecha libre (las 09:00 del día elegido, hora de Chile). */
export function PosponerFecha(p: {
  id: string;
  titulo: string;
  pendiente: boolean;
  onCerrar: () => void;
  onPosponer: (vencimiento: string) => void;
}) {
  const [dia, setDia] = useState("");
  return (
    <Dialog
      abierto
      onCerrar={p.onCerrar}
      titulo="Posponer tarea"
      descripcion={p.titulo}
      acciones={
        <>
          <Button variant="secondary" onClick={p.onCerrar}>
            Cancelar
          </Button>
          <Button
            disabled={!dia || p.pendiente}
            onClick={() => p.onPosponer(instanteEnZona(dia, "09:00"))}
          >
            Posponer
          </Button>
        </>
      }
    >
      <Campo etiqueta="Nueva fecha" htmlFor={`posponer-${p.id}`}>
        <InputFecha id={`posponer-${p.id}`} valor={dia} onCambiar={setDia} />
      </Campo>
    </Dialog>
  );
}

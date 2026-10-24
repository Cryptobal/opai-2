"use client";

import { useState } from "react";

import { Button, Campo, InputFecha, Sheet } from "@opai/ds";

/** Hoja con un campo de fecha (QA pasada 5): el calendario abre sobre la hoja y la oscurece. */
export function MuestraHojaConFecha() {
  const [abierta, setAbierta] = useState(false);
  const [fecha, setFecha] = useState("2026-10-23");
  return (
    <>
      <Button variant="secondary" onClick={() => setAbierta(true)}>
        Abrir hoja con fecha
      </Button>
      <Sheet
        abierto={abierta}
        onCerrar={() => setAbierta(false)}
        titulo="Agregar persona"
        acciones={
          <>
            <Button variant="secondary" onClick={() => setAbierta(false)}>
              Cancelar
            </Button>
            <Button>Crear persona</Button>
          </>
        }
      >
        <Campo etiqueta="Fecha de ingreso" htmlFor="hoja-fecha">
          <InputFecha id="hoja-fecha" valor={fecha} onCambiar={setFecha} />
        </Campo>
      </Sheet>
    </>
  );
}

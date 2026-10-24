"use client";

import { useState } from "react";

import { Button, Campo, CampoDireccion, type Direccion, InputFecha, Sheet } from "@opai/ds";

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

/** Dos direcciones sin `id` en la misma página (QA pasada 5): ninguna debe repetir el id de la otra. */
export function MuestraDireccionesSinId() {
  const [a, setA] = useState<Direccion | null>(null);
  const [b, setB] = useState<Direccion | null>(null);
  const comun = { buscar: async () => [], resolver: async () => null, sinMapa: true };
  return (
    <div data-testid="direcciones-sin-id" className="flex flex-col gap-4">
      <CampoDireccion valor={a} onCambiar={setA} error="Error de la primera" {...comun} />
      <CampoDireccion valor={b} onCambiar={setB} error="Error de la segunda" {...comun} />
    </div>
  );
}

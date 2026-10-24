"use client";

import { useState } from "react";

import { Button, Campo, InputFecha, Sheet, Tabs } from "@opai/ds";

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

const PESTANAS = [
  "Resumen",
  "Contactos",
  "Instalaciones",
  "Personas",
  "Documentos",
  "Actividad",
  "Contratos",
  "Facturas",
];

/** Pestañas que no caben en 375 px, con la última activa (QA pasada 5): degradado y pestaña a la vista. */
export function MuestraPestanas() {
  return (
    <div data-testid="pestanas-qa" className="w-0 min-w-full max-w-md">
      <Tabs
        inicial="facturas"
        tabs={PESTANAS.map((e) => ({ id: e.toLowerCase(), etiqueta: e, contenido: <p>{e}</p> }))}
      />
    </div>
  );
}

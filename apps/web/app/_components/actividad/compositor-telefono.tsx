"use client";

import { Plus } from "lucide-react";
import { useState } from "react";

import { Button, Sheet } from "@opai/ds";

import { Compositor } from "./compositor";
import type { FichaActividad } from "./tipos";

/** En teléfono el compositor es una hoja de pantalla completa; en md+ va en línea (CRM v3). */
export function CompositorResponsivo({ ficha }: { ficha: FichaActividad }) {
  const [abierta, setAbierta] = useState(false);
  return (
    <>
      <Compositor ficha={ficha} className="max-md:hidden" />
      <Button className="w-full md:hidden" size="lg" onClick={() => setAbierta(true)}>
        <Plus className="size-4" aria-hidden />
        Registrar nota, llamada o tarea
      </Button>
      <Sheet
        abierto={abierta}
        onCerrar={() => setAbierta(false)}
        titulo="Registrar actividad"
        telefono="completo"
      >
        <Compositor ficha={ficha} onListo={() => setAbierta(false)} className="border-0 p-0" />
      </Sheet>
    </>
  );
}

"use client";

import { Plus } from "lucide-react";
import dynamic from "next/dynamic";
import { useState } from "react";

import { Button, Sheet, Skeleton } from "@opai/ds";
import type { FichaActividad } from "./tipos";

// El compositor (fechas, responsables) se carga aparte: no pesa en el primer JS de la ficha (ADR-037).
const Compositor = dynamic(() => import("./compositor").then((m) => m.Compositor), {
  loading: () => <Skeleton className="h-48 w-full" />,
});

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

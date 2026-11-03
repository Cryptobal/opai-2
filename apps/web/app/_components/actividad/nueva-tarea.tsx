"use client";

import { Plus } from "lucide-react";
import dynamic from "next/dynamic";
import { useState } from "react";

import { Button, Sheet, Skeleton } from "@opai/ds";

// Combobox y compositor se cargan al abrir la hoja (ADR-037).
const Hoja = dynamic(() => import("./nueva-tarea-hoja").then((m) => m.NuevaTareaHoja), {
  loading: () => <Skeleton className="h-40 w-full" />,
});

/** «Nueva tarea» de Mis tareas: una hoja donde se elige el negocio y se crea la tarea. */
export function NuevaTarea() {
  const [abierta, setAbierta] = useState(false);
  return (
    <>
      <Button onClick={() => setAbierta(true)}>
        <Plus className="size-4" aria-hidden />
        Nueva tarea
      </Button>
      <Sheet abierto={abierta} onCerrar={() => setAbierta(false)} titulo="Nueva tarea" telefono="completo">
        {abierta ? <Hoja onListo={() => setAbierta(false)} /> : null}
      </Sheet>
    </>
  );
}

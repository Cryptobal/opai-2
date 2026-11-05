"use client";

import { Plus } from "lucide-react";

import { cn, estilosBoton, Menu } from "@opai/ds";

import { useAccesos } from "@/app/_components/accesos-contexto";

/**
 * «Crear» (CAR-182): un solo botón con las acciones del núcleo que el rol puede hacer (las mismas
 * del ⌘K, ya filtradas por permiso y módulo activo). Cada una abre su formulario; la escritura la
 * hace su capacidad con `dryRun` e `idempotencyKey`, no este botón.
 */
export function CrearInicio() {
  const a = useAccesos();
  if (!a || a.acciones.length === 0) return null;
  return (
    <Menu
      etiqueta="Crear"
      lado="abajo-derecha"
      claseDisparador={cn(estilosBoton({ variant: "secondary" }), "gap-2 px-3")}
      disparador={
        <>
          <Plus className="size-4" aria-hidden />
          Crear
        </>
      }
      items={a.acciones.map((x) => ({
        id: x.id,
        etiqueta: x.etiqueta,
        onSelect: () => a.onNavegar(x.href),
      }))}
    />
  );
}

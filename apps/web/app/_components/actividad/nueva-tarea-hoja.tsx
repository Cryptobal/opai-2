"use client";

import { useState } from "react";

import { Campo, Combobox } from "@opai/ds";

import { ejecutarCapacidad } from "@/app/_acciones/capacidad";

import { Compositor } from "./compositor";
import type { FichaActividad } from "./tipos";

type Negocio = { id: string; titulo: string; cuentaId: string; cuentaNombre: string };

/** Contenido de «Nueva tarea»: se elige el negocio y se abre el compositor en Tarea. */
export function NuevaTareaHoja({ onListo }: { onListo: () => void }) {
  const [ficha, setFicha] = useState<FichaActividad | null>(null);
  const [conocidos, setConocidos] = useState<Negocio[]>([]);
  async function buscar(q: string) {
    const r = await ejecutarCapacidad("erp", "comercial.negocios.list", {
      limite: 20,
      estado: "abierto",
      ...(q ? { q } : {}),
    });
    const items = r.ok ? (r.data as { items: Negocio[] }).items : [];
    setConocidos((c) => [...c, ...items]);
    return items.map((n) => ({ valor: n.id, etiqueta: n.titulo, detalle: n.cuentaNombre }));
  }
  return (
    <div className="flex flex-col gap-4">
      <Campo
        etiqueta="Negocio"
        htmlFor="nueva-tarea-negocio"
        ayuda="La tarea queda ligada a este negocio y a su cuenta."
      >
        <Combobox
          id="nueva-tarea-negocio"
          opciones={[]}
          valor={ficha?.id ?? null}
          onBuscar={buscar}
          placeholder="Busca un negocio"
          buscarPlaceholder="Nombre del negocio o la cuenta"
          textoInicial="Escribe el nombre del negocio"
          onCambiar={([id]) => {
            const n = conocidos.find((x) => x.id === id);
            setFicha(
              n
                ? {
                    tipo: "negocio",
                    id: n.id,
                    nombre: n.titulo,
                    relacionadas: [{ tipo: "cuenta", id: n.cuentaId, nombre: n.cuentaNombre }],
                  }
                : null,
            );
          }}
        />
      </Campo>
      {ficha ? (
        <Compositor key={ficha.id} ficha={ficha} tipoInicial="tarea" onListo={onListo} className="border-0 p-0" />
      ) : null}
    </div>
  );
}

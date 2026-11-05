"use client";

import { avisar, ChipsEtiquetas, type EtiquetaChip } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

import type { EntidadEtiquetable } from "./tipos";

type Props = {
  entidad: { tipo: EntidadEtiquetable; id: string };
  asignadas: EtiquetaChip[];
  catalogo: EtiquetaChip[];
  /** Puede asignar y quitar (`core:etiquetas.manage`). Sin él, solo se ven. */
  gestiona: boolean;
  /** Puede crear etiquetas nuevas (`core:etiquetas.config`). */
  crea: boolean;
};

/** Etiquetas de una ficha, conectadas a `core.etiquetas.{asignar,quitar,create}`. */
export function EtiquetasEditables(p: Props) {
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const base = { entidadTipo: p.entidad.tipo, entidadIds: [p.entidad.id] };
  const agregar = async (id: string) => {
    if (await ejecutar("core.etiquetas.asignar", { ...base, etiquetaIds: [id] }))
      avisar.exito("Etiqueta agregada");
  };
  const quitar = async (id: string) => {
    if (await ejecutar("core.etiquetas.quitar", { ...base, etiquetaIds: [id] }))
      avisar.exito("Etiqueta quitada");
  };
  const crear = async (nombre: string) => {
    const e = await ejecutar<{ id: string }>("core.etiquetas.create", { nombre });
    if (e) await agregar(e.id);
  };
  const ids = new Set(p.asignadas.map((e) => e.id));
  return (
    <div className="flex flex-col gap-1.5">
      <ChipsEtiquetas
        etiquetas={p.asignadas}
        deshabilitado={pendiente}
        vacio="Sin etiquetas."
        {...(p.gestiona
          ? {
              disponibles: p.catalogo.filter((e) => !ids.has(e.id)),
              onAgregar: (id: string) => void agregar(id),
              onQuitar: (id: string) => void quitar(id),
              ...(p.crea ? { onCrear: (n: string) => void crear(n) } : {}),
            }
          : {})}
      />
      {error ? <p className="text-sm font-medium text-danger-fg">{error}</p> : null}
    </div>
  );
}

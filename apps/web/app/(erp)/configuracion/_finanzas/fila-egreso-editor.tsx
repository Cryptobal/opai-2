"use client";

import { Button, Select } from "@opai/ds";

import { GRUPOS_EGRESO, GRUPO_POR_DEFECTO, type GrupoEgreso } from "@/app/(erp)/finanzas/flujo/_componentes/grupos-egreso";
import type { FilaFlujo } from "@/app/(erp)/finanzas/flujo/_componentes/datos";

/** Una fila de egreso de la planilla: su grupo se cambia aquí y se puede archivar o restaurar. */
export function FilaEgresoEditor(p: {
  fila: FilaFlujo;
  pendiente: boolean;
  onGrupo: (grupo: GrupoEgreso) => void;
  onArchivar: () => void;
}) {
  const { fila } = p;
  return (
    <li className="flex flex-col gap-2 border-b border-border py-2 sm:flex-row sm:items-center sm:justify-between">
      <span>
        {fila.etiqueta}
        {fila.activa ? "" : " · archivada"}
      </span>
      <div className="flex items-center gap-2">
        <Select
          valor={fila.grupo ?? GRUPO_POR_DEFECTO}
          onCambiar={(v) => p.onGrupo(v as GrupoEgreso)}
          opciones={GRUPOS_EGRESO.map((g) => ({ valor: g.valor, etiqueta: g.etiqueta }))}
          aria-label={`Grupo de ${fila.etiqueta}`}
          disabled={p.pendiente}
          className="w-44"
        />
        <Button variant="ghost" disabled={p.pendiente} onClick={p.onArchivar}>
          {fila.activa ? "Archivar" : "Restaurar"}
        </Button>
      </div>
    </li>
  );
}

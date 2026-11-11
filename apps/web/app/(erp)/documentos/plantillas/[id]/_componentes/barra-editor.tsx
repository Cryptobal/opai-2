"use client";

import { Plus } from "lucide-react";

import { Button, Segmentado } from "@opai/ds";

export type ModoEditor = "editar" | "previa";

type Props = {
  modo: ModoEditor;
  onModo: (m: ModoEditor) => void;
  onEnfasis: (marca: "**" | "*") => void;
  onVariable: () => void;
};

/** Barra del diseño 06 (md+): Editar · Vista previa, negrita, cursiva y «+ Variable». */
export function BarraEditor({ modo, onModo, onEnfasis, onVariable }: Props) {
  const editando = modo === "editar";
  return (
    <div className="hidden flex-wrap items-center gap-2 rounded-md border border-border bg-surface p-1.5 md:flex">
      <Segmentado
        etiqueta="Modo"
        activa={modo}
        opciones={[
          { id: "editar", etiqueta: "Editar", onClick: () => onModo("editar") },
          { id: "previa", etiqueta: "Vista previa", onClick: () => onModo("previa") },
        ]}
      />
      <span aria-hidden className="h-6 w-px bg-border" />
      <Button
        variant="ghost"
        size="iconSm"
        aria-label="Negrita"
        title="Negrita: **texto**"
        disabled={!editando}
        onClick={() => onEnfasis("**")}
      >
        <b>B</b>
      </Button>
      <Button
        variant="ghost"
        size="iconSm"
        aria-label="Cursiva"
        title="Cursiva: *texto*"
        disabled={!editando}
        onClick={() => onEnfasis("*")}
      >
        <i>I</i>
      </Button>
      <span className="flex-1" />
      <Button variant="secondary" disabled={!editando} onClick={onVariable}>
        <Plus aria-hidden className="size-4" />
        Variable
      </Button>
    </div>
  );
}

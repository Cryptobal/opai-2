"use client";

import { Plus, Trash2 } from "lucide-react";

import { Button, Input, Select, Switch } from "@opai/ds";

import type { CampoTipo } from "./tipos";

export type CampoEditable = Omit<CampoTipo, "clave"> & { clave?: string; llave: string };

const TIPOS = [
  { valor: "texto", etiqueta: "Texto" },
  { valor: "numero", etiqueta: "Número" },
  { valor: "fecha", etiqueta: "Fecha" },
];
const MAXIMO = 12;

/** Campos propios de un tipo de activo (R4): etiqueta, tipo y si es obligatorio. */
export function EditorCampos({
  campos,
  onCambiar,
}: {
  campos: CampoEditable[];
  onCambiar: (c: CampoEditable[]) => void;
}) {
  const cambiar = (i: number, parcial: Partial<CampoEditable>) =>
    onCambiar(campos.map((c, j) => (j === i ? { ...c, ...parcial } : c)));
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="t-label mb-1">Campos propios</legend>
      <p className="t-caption">Datos que se piden en cada unidad de este tipo, como IMEI o número.</p>
      {campos.map((c, i) => (
        <div key={c.llave} className="flex flex-col gap-2 rounded-md border border-border p-3">
          <div className="flex items-center gap-2">
            <Input
              aria-label={`Nombre del campo ${i + 1}`}
              value={c.etiqueta}
              placeholder="Ej.: IMEI"
              onChange={(e) => cambiar(i, { etiqueta: e.target.value })}
            />
            <Button
              variant="ghost"
              size="iconSm"
              aria-label={`Quitar el campo ${c.etiqueta || i + 1}`}
              onClick={() => onCambiar(campos.filter((_, j) => j !== i))}
            >
              <Trash2 className="size-4" aria-hidden />
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Select
              aria-label={`Tipo del campo ${i + 1}`}
              valor={c.tipo}
              onCambiar={(v) => cambiar(i, { tipo: v as CampoTipo["tipo"] })}
              opciones={TIPOS}
            />
            <Switch etiqueta="Obligatorio" activo={c.obligatorio} onCambiar={(v) => cambiar(i, { obligatorio: v })} />
          </div>
        </div>
      ))}
      {campos.length < MAXIMO ? (
        <Button
          variant="secondary"
          onClick={() =>
            onCambiar([...campos, { llave: crypto.randomUUID(), etiqueta: "", tipo: "texto", obligatorio: false }])
          }
        >
          <Plus className="size-4" aria-hidden />
          Agregar campo
        </Button>
      ) : null}
    </fieldset>
  );
}

"use client";

import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";

import { Button, Checkbox, Switch } from "@opai/ds";
import { type CampoAcceso, esCampoPersonalizado } from "@opai/domain/acceso-config";

type Props = {
  campo: CampoAcceso;
  disabled: boolean;
  primero: boolean;
  ultimo: boolean;
  onCambiar: (c: Partial<CampoAcceso>) => void;
  onMover: (d: -1 | 1) => void;
  onQuitar: () => void;
};

/** Una fila del formulario de la portería: obligatorio, activo, orden y, si es propio, quitar. */
export function FilaCampo({
  campo: f,
  disabled,
  primero,
  ultimo,
  onCambiar,
  onMover,
  onQuitar,
}: Props) {
  return (
    <li className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2">
      <span
        className={`min-w-0 flex-1 basis-full truncate sm:basis-0 ${f.activo ? "" : "text-fg-subtle"}`}
      >
        {f.etiqueta}
      </span>
      <Checkbox
        etiqueta="Obligatorio"
        marcado={f.obligatorio}
        disabled={disabled || !f.activo}
        onCambiar={(obligatorio) => onCambiar({ obligatorio })}
      />
      <Switch
        soloControl
        etiqueta={`Pedir ${f.etiqueta}`}
        activo={f.activo}
        disabled={disabled}
        onCambiar={(activo) => onCambiar({ activo, ...(activo ? {} : { obligatorio: false }) })}
      />
      <Button
        variant="ghost"
        aria-label={`Subir ${f.etiqueta}`}
        disabled={disabled || primero}
        onClick={() => onMover(-1)}
      >
        <ArrowUp aria-hidden className="size-4" />
      </Button>
      <Button
        variant="ghost"
        aria-label={`Bajar ${f.etiqueta}`}
        disabled={disabled || ultimo}
        onClick={() => onMover(1)}
      >
        <ArrowDown aria-hidden className="size-4" />
      </Button>
      {esCampoPersonalizado(f.id) ? (
        <Button
          variant="ghost"
          aria-label={`Quitar ${f.etiqueta}`}
          disabled={disabled}
          onClick={onQuitar}
        >
          <Trash2 aria-hidden className="size-4" />
        </Button>
      ) : null}
    </li>
  );
}

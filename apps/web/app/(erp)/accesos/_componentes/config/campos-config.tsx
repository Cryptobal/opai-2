"use client";

import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import { useState } from "react";

import { Button, Checkbox, Input, SeccionTarjeta, Switch } from "@opai/ds";
import { type CampoAcceso, esCampoPersonalizado, MAX_CAMPOS } from "@opai/domain/acceso-config";

type Props = {
  campos: CampoAcceso[];
  onCambiar: (campos: CampoAcceso[]) => void;
  disabled: boolean;
};

const mover = (xs: CampoAcceso[], i: number, d: -1 | 1) => {
  const ys = [...xs];
  const [x] = ys.splice(i, 1);
  if (x) ys.splice(i + d, 0, x);
  return ys;
};

/** Id nuevo para un campo personalizado, sin chocar con los que ya hay. */
const idNuevo = (xs: CampoAcceso[]) => {
  for (let n = xs.length + 1; ; n++) if (!xs.some((f) => f.id === `c_${n}`)) return `c_${n}`;
};

/**
 * Campos del formulario de la portería: activar, obligatorio, orden y campos propios. Documento y nombre van
 * siempre; empresa, motivo y patente se apagan pero no se quitan; en un vehículo la patente se pide igual.
 */
export function CamposConfig({ campos, onCambiar, disabled }: Props) {
  const [nuevo, setNuevo] = useState("");
  const cambiar = (i: number, c: Partial<CampoAcceso>) =>
    onCambiar(campos.map((f, j) => (j === i ? { ...f, ...c } : f)));
  return (
    <SeccionTarjeta titulo="Formulario de la portería" sinRelleno>
      <p className="t-caption px-4 pt-3">
        Documento y nombre se piden siempre. El resto sale en este orden; lo obligatorio no deja
        registrar sin completarlo.
      </p>
      <ul className="flex flex-col">
        {campos.map((f, i) => (
          <li
            key={f.id}
            className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2"
          >
            <span className={`min-w-0 flex-1 truncate ${f.activo ? "" : "text-fg-subtle"}`}>
              {f.etiqueta}
            </span>
            <Checkbox
              etiqueta="Obligatorio"
              marcado={f.obligatorio}
              disabled={disabled || !f.activo}
              onCambiar={(obligatorio) => cambiar(i, { obligatorio })}
            />
            <Switch
              soloControl
              etiqueta={`Pedir ${f.etiqueta}`}
              activo={f.activo}
              disabled={disabled}
              onCambiar={(activo) =>
                cambiar(i, { activo, ...(activo ? {} : { obligatorio: false }) })
              }
            />
            <Button
              variant="ghost"
              aria-label={`Subir ${f.etiqueta}`}
              disabled={disabled || i === 0}
              onClick={() => onCambiar(mover(campos, i, -1))}
            >
              <ArrowUp aria-hidden className="size-4" />
            </Button>
            <Button
              variant="ghost"
              aria-label={`Bajar ${f.etiqueta}`}
              disabled={disabled || i === campos.length - 1}
              onClick={() => onCambiar(mover(campos, i, 1))}
            >
              <ArrowDown aria-hidden className="size-4" />
            </Button>
            {esCampoPersonalizado(f.id) ? (
              <Button
                variant="ghost"
                aria-label={`Quitar ${f.etiqueta}`}
                disabled={disabled}
                onClick={() => onCambiar(campos.filter((_, j) => j !== i))}
              >
                <Trash2 aria-hidden className="size-4" />
              </Button>
            ) : null}
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-2 p-4">
        <Input
          aria-label="Nombre del campo nuevo"
          placeholder="Campo propio (por ejemplo, «Departamento»)"
          className="min-w-0 flex-1"
          maxLength={60}
          value={nuevo}
          onChange={(e) => setNuevo(e.target.value)}
        />
        <Button
          variant="secondary"
          disabled={disabled || nuevo.trim().length < 2 || campos.length >= MAX_CAMPOS}
          onClick={() => {
            onCambiar([
              ...campos,
              { id: idNuevo(campos), etiqueta: nuevo.trim(), activo: true, obligatorio: false },
            ]);
            setNuevo("");
          }}
        >
          Agregar campo
        </Button>
      </div>
    </SeccionTarjeta>
  );
}

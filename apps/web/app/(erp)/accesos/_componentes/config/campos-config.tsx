"use client";

import { useState } from "react";

import { Button, Input, SeccionTarjeta } from "@opai/ds";
import { type CampoAcceso, MAX_CAMPOS } from "@opai/domain/acceso-config";

import { FilaCampo } from "./fila-campo";

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
          <FilaCampo
            key={f.id}
            campo={f}
            disabled={disabled}
            primero={i === 0}
            ultimo={i === campos.length - 1}
            onCambiar={(c) => cambiar(i, c)}
            onMover={(d) => onCambiar(mover(campos, i, d))}
            onQuitar={() => onCambiar(campos.filter((_, j) => j !== i))}
          />
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

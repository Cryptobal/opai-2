"use client";

import { Campo, Input, Textarea } from "@opai/ds";

export type ValoresGrupo = { nombre: string; descripcion: string };

type Props = {
  valores: ValoresGrupo;
  onCambiar: (v: ValoresGrupo) => void;
  errorNombre?: string | undefined;
};

/** Nombre (único entre los vigentes) y descripción (200) de un grupo. */
export function CamposGrupo({ valores, onCambiar, errorNombre }: Props) {
  return (
    <>
      <Campo etiqueta="Nombre del grupo" htmlFor="grupo-nombre" error={errorNombre}>
        <Input
          id="grupo-nombre"
          value={valores.nombre}
          maxLength={60}
          placeholder="Ej.: Revisión de cotizaciones"
          aria-invalid={errorNombre ? true : undefined}
          onChange={(e) => onCambiar({ ...valores, nombre: e.target.value })}
        />
      </Campo>
      <Campo
        etiqueta="Descripción (opcional)"
        htmlFor="grupo-descripcion"
        ayuda={`${valores.descripcion.length}/200`}
      >
        <Textarea
          id="grupo-descripcion"
          value={valores.descripcion}
          maxLength={200}
          onChange={(e) => onCambiar({ ...valores, descripcion: e.target.value })}
        />
      </Campo>
    </>
  );
}

export const datosGrupo = (v: ValoresGrupo) => ({
  nombre: v.nombre.trim(),
  descripcion: v.descripcion.trim() || null,
});

export const errorDuplicado = (error: string | null) =>
  error?.includes("Ya existe") ? "Ya existe un grupo con ese nombre" : undefined;

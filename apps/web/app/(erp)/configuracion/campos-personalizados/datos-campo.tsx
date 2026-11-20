"use client";

import type { TipoCampoPersonalizado } from "@opai/domain";
import { Alerta, Campo, Input, Select } from "@opai/ds";

import { TIPOS } from "./tipos-campo";

/** Nombre, tipo y ayuda del campo, con el error de guardado arriba. */
export function DatosCampo(p: {
  error: string | null;
  etiqueta: string;
  onEtiqueta: (v: string) => void;
  tipo: TipoCampoPersonalizado;
  onTipo: (t: TipoCampoPersonalizado) => void;
  creado: boolean;
  descripcion: string;
  onDescripcion: (v: string) => void;
}) {
  return (
    <>
      {p.error ? <Alerta tono="danger" titulo={p.error} /> : null}
      <Campo etiqueta="Nombre" htmlFor="campo-etiqueta">
        <Input
          id="campo-etiqueta"
          maxLength={60}
          value={p.etiqueta}
          onChange={(e) => p.onEtiqueta(e.target.value)}
        />
      </Campo>
      <Campo
        etiqueta="Tipo"
        htmlFor="campo-tipo"
        {...(p.creado ? { ayuda: "El tipo no se cambia después de crear el campo." } : {})}
      >
        <Select
          id="campo-tipo"
          valor={p.tipo}
          onCambiar={(v) => p.onTipo(v as TipoCampoPersonalizado)}
          opciones={TIPOS}
          disabled={p.creado}
        />
      </Campo>
      <Campo
        etiqueta="Ayuda"
        htmlFor="campo-ayuda"
        ayuda="Texto corto que se muestra bajo el campo en la ficha."
      >
        <Input
          id="campo-ayuda"
          maxLength={300}
          value={p.descripcion}
          onChange={(e) => p.onDescripcion(e.target.value)}
        />
      </Campo>
    </>
  );
}

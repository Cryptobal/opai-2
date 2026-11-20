"use client";

import {
  TIPOS_CON_OPCIONES,
  type FormatoNumeroCampo,
  type OpcionCampo,
  type TipoCampoPersonalizado,
} from "@opai/domain";
import { Campo, Select } from "@opai/ds";

import { ControlCampo, type Entrada } from "@/app/_components/campos/control-campo";

import { EditorOpciones } from "./editor-opciones";
import { FORMATOS, type CampoConfig } from "./tipos-campo";

/** Lo que depende del tipo: formato de número, opciones y valor por defecto. */
export type Definicion = { formato: FormatoNumeroCampo; opciones: OpcionCampo[]; defecto: Entrada };

export const definicionInicial = (c: CampoConfig | null): Definicion => ({
  formato: c?.formato ?? "decimal",
  opciones: c?.opciones ?? [],
  defecto: typeof c?.valorDefecto === "number" ? String(c.valorDefecto) : (c?.valorDefecto ?? null),
});

const limpias = (o: OpcionCampo[]) =>
  o
    .filter((x) => x.etiqueta.trim())
    .map((x) => ({ etiqueta: x.etiqueta.trim(), valor: x.valor.trim() || x.etiqueta.trim() }));

/** Parte de la entrada de la capacidad que depende del tipo, o null si falta una opción. */
export function entradaDefinicion(tipo: TipoCampoPersonalizado, d: Definicion) {
  const opciones = limpias(d.opciones);
  if (TIPOS_CON_OPCIONES.includes(tipo) && opciones.length === 0) return null;
  return {
    ...(tipo === "numero" ? { formato: d.formato } : {}),
    ...(TIPOS_CON_OPCIONES.includes(tipo) ? { opciones } : {}),
    ...(tipo === "usuario" ? {} : { valorDefecto: d.defecto }),
  };
}

export function DefinicionCampo(p: {
  tipo: TipoCampoPersonalizado;
  d: Definicion;
  onCambiar: (d: Definicion) => void;
}) {
  const { tipo, d, onCambiar } = p;
  const control = {
    tipo,
    formato: tipo === "numero" ? d.formato : null,
    opciones: limpias(d.opciones),
  };
  return (
    <>
      {tipo === "numero" ? (
        <Campo etiqueta="Formato" htmlFor="campo-formato">
          <Select
            id="campo-formato"
            valor={d.formato}
            onCambiar={(v) => onCambiar({ ...d, formato: v as FormatoNumeroCampo })}
            opciones={FORMATOS}
          />
        </Campo>
      ) : null}
      {TIPOS_CON_OPCIONES.includes(tipo) ? (
        <EditorOpciones
          opciones={d.opciones}
          onCambiar={(opciones) => onCambiar({ ...d, opciones })}
        />
      ) : null}
      {tipo === "usuario" ? null : (
        <Campo
          etiqueta="Valor por defecto"
          htmlFor="campo-defecto"
          ayuda="Se propone al llenar la ficha. Opcional."
        >
          <ControlCampo
            c={{ ...control, etiqueta: "Valor por defecto" }}
            id="campo-defecto"
            valor={d.defecto}
            onCambiar={(defecto) => onCambiar({ ...d, defecto })}
          />
        </Campo>
      )}
    </>
  );
}

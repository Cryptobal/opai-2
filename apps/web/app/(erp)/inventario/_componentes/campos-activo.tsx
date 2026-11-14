"use client";

import { Campo, Input, InputFecha } from "@opai/ds";

import type { CampoTipo } from "./tipos";

/** Inputs de los campos propios del tipo (R11): texto, número o fecha, con su obligatorio. */
export function CamposActivo({
  campos,
  valores,
  onCambiar,
}: {
  campos: CampoTipo[];
  valores: Record<string, string>;
  onCambiar: (clave: string, valor: string) => void;
}) {
  return (
    <>
      {campos.map((c) => {
        const id = `ia-campo-${c.clave}`;
        const etiqueta = c.obligatorio ? `${c.etiqueta} (obligatorio)` : c.etiqueta;
        return (
          <Campo key={c.clave} etiqueta={etiqueta} htmlFor={id}>
            {c.tipo === "fecha" ? (
              <InputFecha id={id} valor={valores[c.clave] ?? ""} onCambiar={(v) => onCambiar(c.clave, v)} />
            ) : (
              <Input
                id={id}
                inputMode={c.tipo === "numero" ? "decimal" : undefined}
                value={valores[c.clave] ?? ""}
                onChange={(e) => onCambiar(c.clave, e.target.value)}
              />
            )}
          </Campo>
        );
      })}
    </>
  );
}

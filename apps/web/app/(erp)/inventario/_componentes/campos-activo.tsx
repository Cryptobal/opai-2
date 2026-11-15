"use client";

import { Campo, Input, InputFecha, Textarea } from "@opai/ds";

import type { CampoTipo } from "./tipos";

export type Estado = {
  tipoId: string;
  codigo: string;
  serie: string;
  notas: string;
  valores: Record<string, string>;
};

/** Inputs de los campos propios del tipo (R11): texto, número o fecha, con su obligatorio. */
function CamposActivo({
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
              <InputFecha
                id={id}
                valor={valores[c.clave] ?? ""}
                onCambiar={(v) => onCambiar(c.clave, v)}
              />
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

/** Código, serie, campos propios del tipo y notas de la hoja del activo. */
export function CamposBase({
  e,
  fijar,
  campos,
}: {
  e: Estado;
  fijar: (p: Partial<Estado>) => void;
  campos: CampoTipo[];
}) {
  return (
    <>
      <Campo
        etiqueta="Código"
        htmlFor="ia-codigo"
        ayuda="Único en la empresa, por ejemplo el de la etiqueta."
      >
        <Input
          id="ia-codigo"
          value={e.codigo}
          onChange={(x) => fijar({ codigo: x.target.value })}
          autoFocus
        />
      </Campo>
      <Campo etiqueta="Número de serie" htmlFor="ia-serie">
        <Input id="ia-serie" value={e.serie} onChange={(x) => fijar({ serie: x.target.value })} />
      </Campo>
      <CamposActivo
        campos={campos}
        valores={e.valores}
        onCambiar={(k, v) => fijar({ valores: { ...e.valores, [k]: v } })}
      />
      <Campo etiqueta="Notas" htmlFor="ia-notas">
        <Textarea
          id="ia-notas"
          rows={2}
          value={e.notas}
          onChange={(x) => fijar({ notas: x.target.value })}
        />
      </Campo>
    </>
  );
}

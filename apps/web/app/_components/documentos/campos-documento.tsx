"use client";

import { Campo, Combobox, InputFecha } from "@opai/ds";

import type { TipoDocumento } from "./tipos";

/** Tipo de documento (de los que se ofrecen), emisión y vencimiento. */
export function CamposDocumento({
  visibles,
  tipoId,
  onTipo,
  emitido,
  onEmitido,
  vence,
  onVence,
}: {
  visibles: TipoDocumento[];
  tipoId: string | null;
  onTipo: (tipo: TipoDocumento | undefined) => void;
  emitido: string;
  onEmitido: (v: string) => void;
  vence: string;
  onVence: (v: string) => void;
}) {
  const tipo = visibles.find((t) => t.id === tipoId);
  return (
    <>
      <Campo
        etiqueta="Tipo de documento"
        htmlFor="d-tipo"
        ayuda="Elígelo antes de agregar el archivo."
      >
        <Combobox
          id="d-tipo"
          placeholder="Elegir tipo"
          opciones={visibles.map((t) => ({
            valor: t.id,
            etiqueta: t.nombre,
            ...(t.obligatorio ? { detalle: "Obligatorio" } : {}),
          }))}
          valor={tipoId}
          onCambiar={([v]) => onTipo(visibles.find((x) => x.id === v))}
        />
      </Campo>
      <div className="grid grid-cols-2 gap-3">
        <Campo etiqueta="Emisión" htmlFor="d-emision">
          <InputFecha id="d-emision" valor={emitido} onCambiar={onEmitido} />
        </Campo>
        {tipo?.tieneVencimiento !== false ? (
          <Campo etiqueta="Vencimiento" htmlFor="d-vence">
            <InputFecha id="d-vence" valor={vence} onCambiar={onVence} />
          </Campo>
        ) : null}
      </div>
    </>
  );
}

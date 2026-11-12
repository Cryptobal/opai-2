"use client";

import { Alerta, Campo, Input, Select } from "@opai/ds";

import { pesos } from "@/lib/fechas";

import { corrigeSoloTexto } from "../_componentes/monto-nota";

const CODIGOS = [
  { valor: "1", etiqueta: "1 · Anula el documento" },
  { valor: "3", etiqueta: "3 · Corrige montos" },
  { valor: "2", etiqueta: "2 · Corrige texto" },
];

type Props = {
  esNc: boolean;
  total: number;
  codigo: string;
  setCodigo: (v: string) => void;
  monto: string;
  setMonto: (v: string) => void;
  montoOk: boolean;
  motivo: string;
  setMotivo: (v: string) => void;
  motivoOk: boolean;
};

/** Campos de la nota: CodRef y monto (solo la de crédito) y el motivo. */
export function CamposNota(p: Props) {
  return (
    <>
      {p.esNc ? (
        <>
          <Campo etiqueta="Qué hace la nota (CodRef)" htmlFor="nota-codigo">
            <Select id="nota-codigo" valor={p.codigo} onCambiar={p.setCodigo} opciones={CODIGOS} />
          </Campo>
          {corrigeSoloTexto(p.codigo) ? (
            <Alerta tono="info" titulo="Sin monto">
              Esta nota solo corrige el texto del documento. No cambia lo que el cliente debe; el SII la registra por $1 simbólico.
            </Alerta>
          ) : (
            <Campo
              etiqueta="Monto (CLP)"
              htmlFor="nota-monto"
              ayuda="El total anula; menos corrige parcialmente. El tope acumulado lo valida el servidor."
              error={p.monto && !p.montoOk ? `Entre 1 y ${pesos(p.total)}.` : undefined}
            >
              <Input
                id="nota-monto"
                inputMode="numeric"
                value={p.monto}
                onChange={(e) => p.setMonto(e.target.value.replace(/\D/g, ""))}
              />
            </Campo>
          )}
        </>
      ) : null}
      <Campo
        etiqueta="Motivo"
        htmlFor="nota-motivo"
        error={p.motivo.length > 0 && !p.motivoOk ? "Mínimo 3 caracteres." : undefined}
      >
        <Input
          id="nota-motivo"
          value={p.motivo}
          maxLength={300}
          onChange={(e) => p.setMotivo(e.target.value)}
        />
      </Campo>
    </>
  );
}

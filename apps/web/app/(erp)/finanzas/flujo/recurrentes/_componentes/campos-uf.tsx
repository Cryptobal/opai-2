"use client";

import { Campo, Input, Select } from "@opai/ds";

import { type PoliticaUf, POLITICAS } from "./tipos";

/** Qué día de UF usa cada cuota (paridad con OPAI 1), solo para montos en UF. */
export function CamposUf(p: { politica: PoliticaUf; onPolitica: (v: PoliticaUf) => void; dia: string; onDia: (v: string) => void; diaOk: boolean }) {
  return (
    <>
      <Campo etiqueta="Valor de la UF" htmlFor="rc-politica" ayuda="Si la UF de ese día aún no se publica, el flujo usa la última y marca la cuota como estimada.">
        <Select id="rc-politica" valor={p.politica} onCambiar={(v) => p.onPolitica(v as PoliticaUf)} opciones={POLITICAS} />
      </Campo>
      {p.politica === "dia_fijo" ? (
        <Campo etiqueta="Día de la UF" htmlFor="rc-uf-dia" {...(p.diaOk ? {} : { error: "Del 1 al 31." })}>
          <Input id="rc-uf-dia" inputMode="numeric" value={p.dia} onChange={(e) => p.onDia(e.target.value.replace(/\D/g, ""))} />
        </Campo>
      ) : null}
    </>
  );
}

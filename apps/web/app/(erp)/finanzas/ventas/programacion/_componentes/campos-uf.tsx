"use client";

import { Campo, Input, Select } from "@opai/ds";

import type { FormProgramacion } from "./tipos";

type Props = { f: FormProgramacion; set: (cambio: Partial<FormProgramacion>) => void };

/** Qué UF del SII se usa para las líneas en UF (BRIEF-26). */
export function CamposUf({ f, set }: Props) {
  return (
    <>
      {f.moneda === "UF" ? (
        <Campo
          etiqueta="UF que se usa"
          htmlFor="prog-politica-uf"
          ayuda="La UF publicada por el SII para esa fecha."
        >
          <Select
            id="prog-politica-uf"
            valor={f.politicaUf}
            onCambiar={(v) => set({ politicaUf: v })}
            opciones={[
              { valor: "RUN_DAY", etiqueta: "La del día de generación" },
              { valor: "FIRST_DAY_MONTH", etiqueta: "La del primer día del mes" },
              { valor: "LAST_DAY_MONTH", etiqueta: "La del último día del mes" },
              { valor: "LAST_DAY_PREV_MONTH", etiqueta: "La del último día del mes anterior" },
              { valor: "CUSTOM_DAY", etiqueta: "La de un día fijo del mes" },
            ]}
          />
        </Campo>
      ) : null}
      {f.moneda === "UF" && f.politicaUf === "CUSTOM_DAY" ? (
        <Campo etiqueta="Día de la UF" htmlFor="prog-dia-uf">
          <Input
            id="prog-dia-uf"
            inputMode="numeric"
            value={f.diaUf}
            onChange={(e) => set({ diaUf: e.target.value })}
          />
        </Campo>
      ) : null}
    </>
  );
}

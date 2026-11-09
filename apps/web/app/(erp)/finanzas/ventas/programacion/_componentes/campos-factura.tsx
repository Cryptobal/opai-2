"use client";

import { Campo, Input, Select } from "@opai/ds";

import type { FormProgramacion } from "./tipos";

type Props = { f: FormProgramacion; set: (cambio: Partial<FormProgramacion>) => void };

/** Cuándo se factura, aparte del día en que se genera el borrador (y se manda la proforma). */
export function CamposFactura({ f, set }: Props) {
  return (
    <>
      <Campo
        etiqueta="Cuándo se factura"
        htmlFor="prog-factura-modo"
        ayuda="El borrador y la proforma salen el día de generación; la factura se proyecta aparte."
      >
        <Select
          id="prog-factura-modo"
          valor={f.facturaModo}
          onCambiar={(v) => set({ facturaModo: v as FormProgramacion["facturaModo"] })}
          opciones={[
            { valor: "mismo_dia", etiqueta: "El mismo día del borrador" },
            { valor: "dias", etiqueta: "Unos días después del borrador" },
            { valor: "dia_fijo", etiqueta: "Un día fijo del mes" },
          ]}
        />
      </Campo>
      {f.facturaModo === "dias" ? (
        <Campo etiqueta="Días hasta la factura (0 a 120)" htmlFor="prog-dias-factura">
          <Input
            id="prog-dias-factura"
            inputMode="numeric"
            value={f.diasFacturacion}
            onChange={(e) => set({ diasFacturacion: e.target.value })}
          />
        </Campo>
      ) : null}
      {f.facturaModo === "dia_fijo" ? (
        <>
          <Campo etiqueta="Día de la factura" htmlFor="prog-dia-factura" ayuda="1 a 31, o -1 para el último día.">
            <Input
              id="prog-dia-factura"
              inputMode="numeric"
              value={f.diaFactura}
              onChange={(e) => set({ diaFactura: e.target.value })}
            />
          </Campo>
          <Campo etiqueta="Del mes" htmlFor="prog-mes-factura">
            <Select
              id="prog-mes-factura"
              valor={f.mesRelativoFactura}
              onCambiar={(v) => set({ mesRelativoFactura: v as FormProgramacion["mesRelativoFactura"] })}
              opciones={[
                { valor: "MES_ACTUAL", etiqueta: "Del mes del borrador" },
                { valor: "MES_SIGUIENTE", etiqueta: "Del mes siguiente" },
              ]}
            />
          </Campo>
        </>
      ) : null}
    </>
  );
}

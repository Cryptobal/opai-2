"use client";

import { Campo, Input, Select, Switch } from "@opai/ds";

import type { FormProgramacion } from "./tipos";

type Props = { f: FormProgramacion; set: (cambio: Partial<FormProgramacion>) => void };

/** Cuándo salen los previos al cliente, esperar su OK (opcional) y exigir orden de compra. */
export function CamposPrevios({ f, set }: Props) {
  const conPrevios = f.autoEnvioProforma || f.autoEnvioEstadoPago;
  return (
    <>
      {conPrevios ? (
        <>
          <Campo
            etiqueta="Cuándo se envía"
            htmlFor="prog-previo-cuando"
            ayuda="Es aparte del día en que se genera el borrador y del día de la factura."
          >
            <Select
              id="prog-previo-cuando"
              valor={f.previoCuando}
              onCambiar={(v) => set({ previoCuando: v as FormProgramacion["previoCuando"] })}
              opciones={[
                { valor: "generar", etiqueta: "Al generar el borrador" },
                { valor: "fecha_acordada", etiqueta: "En la fecha acordada con el cliente" },
              ]}
            />
          </Campo>
          {f.previoCuando === "fecha_acordada" ? (
            <Campo
              etiqueta="Día acordado"
              htmlFor="prog-previo-dia"
              ayuda="Día del mes, de 1 a 31. Si el mes no lo tiene, sale el último día."
            >
              <Input
                id="prog-previo-dia"
                inputMode="numeric"
                value={f.previoDia}
                onChange={(e) => set({ previoDia: e.target.value })}
              />
            </Campo>
          ) : null}
        </>
      ) : null}
      <Switch
        etiqueta="Esperar el OK del cliente antes de emitir"
        descripcion="Apagado, el OK solo se informa. Encendido, «Emitir» queda bloqueado hasta que el cliente apruebe."
        activo={f.esperarOk}
        onCambiar={(v) => set({ esperarOk: v })}
      />
      <Switch
        etiqueta="El cliente exige orden de compra"
        descripcion="Cada factura necesita su orden de compra (referencia 801) antes de emitirse."
        activo={f.exigeOc}
        onCambiar={(v) => set({ exigeOc: v })}
      />
    </>
  );
}

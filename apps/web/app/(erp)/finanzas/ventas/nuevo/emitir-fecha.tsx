"use client";

import { Campo, InputFecha } from "@opai/ds";

type Props = {
  valor: string;
  onCambiar: (v: string) => void;
  hoyIso: string;
  disabled: boolean;
};

/** Fecha de emisión de la factura: hoy o anterior, elegida con el calendario del DS; queda en el borrador y se usa al emitir. */
export function EmitirFechaEmision({ valor, onCambiar, hoyIso, disabled }: Props) {
  const futura = valor !== "" && valor > hoyIso;
  return (
    <Campo
      etiqueta="Fecha de emisión"
      htmlFor="emit-fecha"
      ayuda="Por defecto es hoy; puede ser una fecha anterior, no posterior."
      {...(futura ? { error: "No puede ser posterior a hoy." } : {})}
    >
      <InputFecha id="emit-fecha" valor={valor} onCambiar={onCambiar} disabled={disabled} invalido={futura || valor === ""} />
    </Campo>
  );
}

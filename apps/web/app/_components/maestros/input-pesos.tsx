"use client";

import { Input } from "@opai/ds";

const digitos = (t: string) => t.replace(/\D/g, "").replace(/^0+(?=\d)/, "");

/** Monto en CLP entero ("$ 560.000"): guarda solo dígitos; vacío = sin valor. */
export function InputPesos(props: {
  id: string;
  valor: string;
  onCambiar: (digitos: string) => void;
  placeholder?: string;
}) {
  return (
    <Input
      id={props.id}
      inputMode="numeric"
      placeholder={props.placeholder ?? "$ —"}
      className="t-numeric"
      value={props.valor ? `$ ${Number(props.valor).toLocaleString("es-CL")}` : ""}
      onChange={(e) => props.onCambiar(digitos(e.target.value))}
    />
  );
}

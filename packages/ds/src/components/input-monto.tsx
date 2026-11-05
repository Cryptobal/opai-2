import type { InputHTMLAttributes } from "react";

import { formatearMiles, soloDigitos } from "../lib/formato-entrada";
import { Input } from "./input";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> & {
  /** Solo dígitos, sin máscara («800000»); vacío si no hay valor. */
  valor: string;
  /** Recibe el número puro (solo dígitos) para guardarlo tal cual. */
  onCambiar: (digitos: string) => void;
  invalido?: boolean | undefined;
};

/**
 * Monto entero (CLP) con separador de miles es-CL mientras se escribe («800.000»). El estado
 * del formulario guarda solo dígitos: lo que viaja a la capacidad es el número puro.
 */
export function InputMonto({ valor, onCambiar, invalido, ...props }: Props) {
  return (
    <Input
      inputMode="numeric"
      autoComplete="off"
      {...props}
      value={formatearMiles(valor)}
      onChange={(e) => onCambiar(soloDigitos(e.target.value))}
      aria-invalid={invalido || undefined}
    />
  );
}

"use client";

import { Campo, Input } from "@opai/ds";

type Props = {
  id: string;
  etiqueta: string;
  valor: string;
  onCambiar: (v: string) => void;
  placeholder?: string;
  tipo?: "text" | "email" | "tel" | "url";
  mono?: boolean;
  disabled?: boolean;
  error?: string | undefined;
};

/** Campo de texto con etiqueta (formularios de Configuración). */
export function CampoTexto(p: Props) {
  return (
    <Campo etiqueta={p.etiqueta} htmlFor={p.id} {...(p.error ? { error: p.error } : {})}>
      <Input
        id={p.id}
        type={p.tipo ?? "text"}
        value={p.valor}
        placeholder={p.placeholder}
        disabled={p.disabled}
        className={p.mono ? "t-mono" : undefined}
        aria-invalid={p.error ? true : undefined}
        onChange={(e) => p.onCambiar(e.target.value)}
      />
    </Campo>
  );
}

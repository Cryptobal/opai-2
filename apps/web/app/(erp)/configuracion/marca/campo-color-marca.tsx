"use client";

import { Campo, Input } from "@opai/ds";

const HEX = /^#[0-9a-fA-F]{6}$/;
const NEGRO = `#${"0".repeat(6)}`;
const errorHex = (c: string) => (c && !HEX.test(c) ? 'Usa el formato "#RRGGBB"' : undefined);

export function CampoColorMarca({
  id,
  etiqueta,
  valor,
  onCambiar,
  disabled,
}: {
  id: string;
  etiqueta: string;
  valor: string;
  onCambiar: (v: string) => void;
  disabled: boolean;
}) {
  const e = errorHex(valor);
  return (
    <Campo etiqueta={etiqueta} htmlFor={id} {...(e ? { error: e } : {})}>
      <div className="flex gap-2">
        <Input
          type="color"
          aria-label={`${etiqueta}: selector`}
          className="w-14 flex-none p-1"
          value={HEX.test(valor) ? valor : NEGRO}
          disabled={disabled}
          onChange={(x) => onCambiar(x.target.value)}
        />
        <Input
          id={id}
          className="t-mono"
          placeholder="Código hex de 6 dígitos"
          value={valor}
          disabled={disabled}
          aria-invalid={e ? true : undefined}
          onChange={(x) => onCambiar(x.target.value.trim())}
        />
      </div>
    </Campo>
  );
}

export function errorColorMarca(c: string) {
  return errorHex(c);
}
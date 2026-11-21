import { Campo, Input } from "@opai/ds";

export const MAX: Readonly<Record<string, number>> = { empresa: 120, patente: 12 };

/** Un campo de texto de la portería (sin autocompletar: el teléfono es compartido). */
export function Texto(p: {
  id: string;
  etiqueta: string;
  valor: string;
  max: number;
  onCambiar: (v: string) => void;
}) {
  return (
    <Campo etiqueta={p.etiqueta} htmlFor={p.id}>
      <Input
        id={p.id}
        value={p.valor}
        maxLength={p.max}
        autoComplete="off"
        onChange={(e) => p.onCambiar(e.target.value)}
      />
    </Campo>
  );
}

import { Campo, Input } from "@opai/ds";

import type { Punto } from "./editor-puntos";

export function SelectorPuntoPrivacidad({
  puntos,
  disabled,
  onElegir,
}: {
  puntos: Punto[];
  disabled: boolean;
  onElegir: (puntoId: string) => void;
}) {
  if (!puntos.length) return null;
  return (
    <Campo etiqueta="Punto (opcional)" htmlFor="pv-punto" ayuda="El QR incluye el punto si eliges uno.">
      <Input
        id="pv-punto"
        list="puntos-lista"
        disabled={disabled}
        placeholder="Todos los puntos"
        onChange={(e) => {
          const p = puntos.find((x) => x.nombre === e.target.value.trim());
          onElegir(p?.id ?? "");
        }}
      />
      <datalist id="puntos-lista">
        {puntos.map((p) => (
          <option key={p.id ?? p.nombre} value={p.nombre} />
        ))}
      </datalist>
    </Campo>
  );
}
"use client";

import { Switch } from "@opai/ds";

const PORTALES = [
  ["cliente", "Cliente"],
  ["trabajador", "Trabajador"],
] as const;

/** Portales en los que se ve el documento (se aplica cuando estén disponibles). */
export function CampoVisibilidad({
  portales,
  onCambiar,
}: {
  portales: string[];
  onCambiar: (portales: string[]) => void;
}) {
  return (
    <fieldset>
      <legend className="t-label mb-1 text-fg">Visible en portal</legend>
      {PORTALES.map(([id, etiqueta]) => (
        <Switch
          key={id}
          etiqueta={etiqueta}
          activo={portales.includes(id)}
          onCambiar={(on) => onCambiar(on ? [...portales, id] : portales.filter((x) => x !== id))}
        />
      ))}
      <p className="t-caption">Se aplica a los portales cuando estén disponibles.</p>
    </fieldset>
  );
}

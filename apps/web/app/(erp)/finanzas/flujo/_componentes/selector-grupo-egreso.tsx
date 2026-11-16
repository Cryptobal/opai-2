"use client";

import { Campo, Select } from "@opai/ds";

import { GRUPOS_EGRESO, type GrupoEgreso } from "./grupos-egreso";

/** Elige el grupo de egreso de una fila del flujo (Remuneraciones, Gastos, Impuestos o Financiamiento). */
export function SelectorGrupoEgreso(p: {
  id: string;
  valor: GrupoEgreso;
  onCambiar: (grupo: GrupoEgreso) => void;
  etiqueta?: string;
  ayuda?: string;
  disabled?: boolean;
}) {
  return (
    <Campo etiqueta={p.etiqueta ?? "Grupo en el flujo"} htmlFor={p.id} {...(p.ayuda ? { ayuda: p.ayuda } : {})}>
      <Select
        id={p.id}
        valor={p.valor}
        onCambiar={(v) => p.onCambiar(v as GrupoEgreso)}
        opciones={GRUPOS_EGRESO.map((g) => ({ valor: g.valor, etiqueta: g.etiqueta }))}
        {...(p.disabled ? { disabled: true } : {})}
      />
    </Campo>
  );
}

"use client";

import { avisar, Switch } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

type Props = {
  id: string;
  campo: "obligatorio" | "tieneVencimiento";
  activo: boolean;
  etiqueta: string;
  disabled?: boolean;
};

/** Interruptor de una celda (obligatorio / vence) que guarda al cambiar. */
export function SwitchTipo({ id, campo, activo, etiqueta, disabled }: Props) {
  const { ejecutar, pendiente } = useCapacidad("erp");
  return (
    <Switch
      soloControl
      etiqueta={etiqueta}
      activo={activo}
      disabled={disabled || pendiente}
      onCambiar={async (v) => {
        if (await ejecutar("core.documento_tipos.update", { id, [campo]: v }))
          avisar.exito("Tipo actualizado");
        else avisar.error("No se pudo actualizar el tipo");
      }}
    />
  );
}

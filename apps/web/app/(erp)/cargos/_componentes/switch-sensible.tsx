"use client";

import { avisar, Switch } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

/** Interruptor "Sueldo sensible" de un cargo (15): guarda al cambiar. */
export function SwitchSensible({ id, activo }: { id: string; activo: boolean }) {
  const { ejecutar, pendiente } = useCapacidad("erp");
  return (
    <Switch
      etiqueta="Sueldo sensible"
      descripcion="Solo owner y admin ven los montos"
      activo={activo}
      disabled={pendiente}
      onCambiar={async (v) => {
        if (await ejecutar("core.cargos.update", { id, sueldoSensible: v }))
          avisar.exito(
            v ? "Sueldo marcado como sensible" : "Sueldo visible para todos los roles con acceso",
          );
      }}
    />
  );
}

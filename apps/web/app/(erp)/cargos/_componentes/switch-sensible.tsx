"use client";

import { avisar, Switch } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

/** Interruptor "Sueldo sensible" de un cargo (15): guarda al cambiar. */
export function SwitchSensible({
  id,
  activo,
  puedeGestionar,
}: {
  id: string;
  activo: boolean;
  puedeGestionar: boolean;
}) {
  const { ejecutar, pendiente } = useCapacidad("erp");
  if (!puedeGestionar)
    return <p className="t-body text-fg">Sueldo sensible: {activo ? "Sí" : "No"}</p>;
  return (
    <Switch
      etiqueta="Sueldo sensible"
      descripcion="Solo quienes tienen permiso para ver sueldos sensibles ven los montos"
      activo={activo}
      disabled={!puedeGestionar || pendiente}
      onCambiar={async (v) => {
        if (await ejecutar("core.cargos.update", { id, sueldoSensible: v }))
          avisar.exito("Privacidad del sueldo actualizada");
      }}
    />
  );
}

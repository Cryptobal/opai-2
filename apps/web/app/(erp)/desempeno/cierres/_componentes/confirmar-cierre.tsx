"use client";

import { avisar } from "@opai/ds";

import { DialogoConfirmar } from "@/app/_components/maestros/dialogo-confirmar";
import { useCapacidad } from "@/app/_components/use-capacidad";

type Props = { periodo: string; mes: string; onCerrar: () => void };

/** Confirmación de cierre del mes: se descarga al abrirla (ADR-037). Cerrar no se deshace. */
export function ConfirmarCierre({ periodo, mes, onCerrar }: Props) {
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  return (
    <DialogoConfirmar
      confirmacion={{
        titulo: `¿Cerrar ${mes}?`,
        descripcion:
          "Se guarda el resultado de cada persona con su cargo y scorecard de ese mes. Desde ahí no cambia aunque se corrija un dato, y el mes no se puede reabrir.",
        boton: `Cerrar ${mes}`,
        peligro: true,
      }}
      pendiente={pendiente}
      error={error}
      onCerrar={onCerrar}
      onConfirmar={async () => {
        if (!(await ejecutar("desempeno.periodos.cerrar", { periodo }))) return;
        avisar.exito(`${mes} quedó cerrado`);
        onCerrar();
      }}
    />
  );
}

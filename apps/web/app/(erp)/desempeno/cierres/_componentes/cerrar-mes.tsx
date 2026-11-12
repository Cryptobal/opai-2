"use client";

import { useState } from "react";

import { avisar, Button } from "@opai/ds";

import { DialogoConfirmar } from "@/app/_components/maestros/dialogo-confirmar";
import { useCapacidad } from "@/app/_components/use-capacidad";

import { mesCorto } from "../../_componentes/tipos";

/** Cierra a mano el mes anterior (`desempeno.periodos.cerrar`) tras confirmar: no se puede reabrir. */
export function CerrarMes({ periodo }: { periodo: string }) {
  const { ejecutar, pendiente, error, limpiarError } = useCapacidad("erp");
  const [confirmando, setConfirmando] = useState(false);
  const mes = mesCorto(periodo);
  return (
    <>
      <Button
        onClick={() => {
          limpiarError();
          setConfirmando(true);
        }}
      >
        Cerrar {mes}
      </Button>
      {confirmando ? (
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
          onCerrar={() => setConfirmando(false)}
          onConfirmar={async () => {
            if (!(await ejecutar("desempeno.periodos.cerrar", { periodo }))) return;
            avisar.exito(`${mes} quedó cerrado`);
            setConfirmando(false);
          }}
        />
      ) : null}
    </>
  );
}

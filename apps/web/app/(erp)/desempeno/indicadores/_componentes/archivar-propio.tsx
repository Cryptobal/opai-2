"use client";

import { useState } from "react";

import { avisar, Button } from "@opai/ds";

import { DialogoConfirmar } from "@/app/_components/maestros/dialogo-confirmar";
import { useCapacidad } from "@/app/_components/use-capacidad";

type Props = { id: string; nombre: string; onListo: () => void };

/** Archiva un indicador propio (`desempeno.propios.archivar`) tras confirmar: no se puede deshacer. */
export function ArchivarPropio({ id, nombre, onListo }: Props) {
  const { ejecutar, pendiente, error, limpiarError } = useCapacidad("erp");
  const [confirmando, setConfirmando] = useState(false);
  return (
    <>
      <Button
        variant="ghost"
        onClick={() => {
          limpiarError();
          setConfirmando(true);
        }}
      >
        Archivar este indicador
      </Button>
      {confirmando ? (
        <DialogoConfirmar
          confirmacion={{
            titulo: `¿Archivar «${nombre}»?`,
            descripcion:
              "Ya no se podrá agregar a ningún scorecard y no se puede deshacer. Si un cargo lo usa hoy, primero quítalo de su scorecard.",
            boton: "Archivar",
            peligro: true,
          }}
          pendiente={pendiente}
          error={error}
          onCerrar={() => setConfirmando(false)}
          onConfirmar={async () => {
            if (!(await ejecutar("desempeno.propios.archivar", { id }))) return;
            avisar.exito("Indicador archivado");
            setConfirmando(false);
            onListo();
          }}
        />
      ) : null}
    </>
  );
}

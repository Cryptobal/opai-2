"use client";

import { useState } from "react";

import { avisar, Button } from "@opai/ds";

import { DialogoConfirmar } from "@/app/_components/maestros/dialogo-confirmar";
import { useCapacidad } from "@/app/_components/use-capacidad";

/** Quitar una entrada de la lista. Si ya se usó en un ingreso, queda vencida en vez de borrarse. */
export function QuitarEntrada({ id, nombre }: { id: string; nombre: string }) {
  const { ejecutar, pendiente, error, limpiarError } = useCapacidad("erp");
  const [abierto, setAbierto] = useState(false);

  async function quitar() {
    const r = await ejecutar<{ accion: "eliminada" | "vencida" }>("acceso.listas.quitar", { id });
    if (!r) return;
    avisar.exito(
      r.accion === "vencida" ? "Quedó vencida (ya se había usado)" : "Quitada de la lista",
    );
    setAbierto(false);
  }

  return (
    <>
      <Button variant="ghost" onClick={() => setAbierto(true)}>
        Quitar
      </Button>
      {abierto ? (
        <DialogoConfirmar
          confirmacion={{
            titulo: "Quitar de la lista",
            descripcion: `${nombre} deja de estar en esta lista. Si ya entró alguna vez, la entrada queda vencida para conservar el historial.`,
            boton: "Quitar",
            peligro: true,
          }}
          pendiente={pendiente}
          error={error}
          onCerrar={() => {
            limpiarError();
            setAbierto(false);
          }}
          onConfirmar={() => void quitar()}
        />
      ) : null}
    </>
  );
}

"use client";

import { useState } from "react";

import { avisar, Button } from "@opai/ds";

import { DialogoConfirmar } from "@/app/_components/maestros/dialogo-confirmar";
import { useCapacidad } from "@/app/_components/use-capacidad";

/** Cancelar un prerregistro: sus QR dejan de servir desde ahora. No se borra. */
export function CancelarPrerregistro({ id }: { id: string }) {
  const { ejecutar, pendiente, error, limpiarError } = useCapacidad("erp");
  const [abierto, setAbierto] = useState(false);

  async function cancelar() {
    if (!(await ejecutar("acceso.prerregistros.cancelar", { id }))) return;
    avisar.exito("Prerregistro cancelado");
    setAbierto(false);
  }

  return (
    <>
      <Button variant="secondary" onClick={() => setAbierto(true)}>
        Cancelar prerregistro
      </Button>
      {abierto ? (
        <DialogoConfirmar
          confirmacion={{
            titulo: "Cancelar prerregistro",
            descripcion:
              "Las invitaciones dejan de servir desde ahora y el guardia ya no verá a estos visitantes como autorizados.",
            boton: "Cancelar prerregistro",
            peligro: true,
          }}
          pendiente={pendiente}
          error={error}
          onCerrar={() => {
            limpiarError();
            setAbierto(false);
          }}
          onConfirmar={() => void cancelar()}
        />
      ) : null}
    </>
  );
}

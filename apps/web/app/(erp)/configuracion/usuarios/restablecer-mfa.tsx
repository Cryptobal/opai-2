"use client";

import { useState } from "react";

import { avisar, Button, Dialog } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

type Props = { membershipId: string; nombre: string };

/** Restablece (apaga) el segundo factor de otro usuario (CAR-54): solo un owner, nunca sobre uno
 * mismo. Avisa a la persona por correo; el estado (p.puedeRestablecerMfa) lo decide el llamador. */
export function RestablecerMfa({ membershipId, nombre }: Props) {
  const { ejecutar } = useCapacidad("erp");
  const [confirmar, setConfirmar] = useState(false);

  async function restablecer() {
    setConfirmar(false);
    if (await ejecutar("core.users.mfa_restablecer", { membershipId })) {
      avisar.exito("Segundo factor restablecido. Avisamos a la persona por correo.");
    }
  }

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col">
          <span className="t-label text-fg">Segundo factor</span>
          <span className="t-caption">Activo. Restablécelo si perdió el teléfono.</span>
        </div>
        <Button variant="secondary" size="md" onClick={() => setConfirmar(true)}>
          Restablecer MFA
        </Button>
      </div>
      <Dialog
        abierto={confirmar}
        onCerrar={() => setConfirmar(false)}
        titulo={`¿Restablecer el segundo factor de ${nombre}?`}
        descripcion="Queda desactivado hasta que vuelva a activarlo. Le avisamos por correo de inmediato."
        acciones={
          <>
            <Button variant="secondary" onClick={() => setConfirmar(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={restablecer}>
              Restablecer
            </Button>
          </>
        }
      />
    </>
  );
}

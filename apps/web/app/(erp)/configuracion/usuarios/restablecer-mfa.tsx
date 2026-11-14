"use client";

import { useState } from "react";
import { avisar, Button, Dialog } from "@opai/ds";
import { useCapacidad } from "@/app/_components/use-capacidad";
import type { Miembro } from "./usuarios-lista";

export function RestablecerMfa({ miembro }: { miembro: Miembro }) {
  const [abierto, setAbierto] = useState(false);
  const { ejecutar, error, pendiente } = useCapacidad("erp");
  async function restablecer() {
    if (await ejecutar("core.users.restablecer_mfa", { membershipId: miembro.id })) {
      setAbierto(false);
      avisar.exito("Segundo factor restablecido");
    }
  }
  return (
    <>
      <Button variant="secondary" onClick={() => setAbierto(true)}>
        Restablecer MFA
      </Button>
      <Dialog
        abierto={abierto}
        onCerrar={() => setAbierto(false)}
        titulo={`¿Restablecer MFA de ${miembro.nombre}?`}
        descripcion="Esta acción es irreversible: elimina su segundo factor, cierra sus sesiones y le avisa por correo. Deberá configurarlo nuevamente."
        acciones={
          <>
            <Button variant="secondary" onClick={() => setAbierto(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={restablecer}
              cargando={pendiente}
              disabled={pendiente}
            >
              Restablecer MFA
            </Button>
          </>
        }
      >
        {error ? <p className="text-sm text-danger-fg">{error}</p> : null}
      </Dialog>
    </>
  );
}

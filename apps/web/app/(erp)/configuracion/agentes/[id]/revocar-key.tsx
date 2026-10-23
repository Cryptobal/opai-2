"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { avisar, Button, Dialog, SeccionTarjeta } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

/** Revocar la key: deja de funcionar de inmediato para todo agente que la use. */
export function RevocarKey({ id, nombre }: { id: string; nombre: string }) {
  const [abierto, setAbierto] = useState(false);
  const router = useRouter();
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  return (
    <SeccionTarjeta titulo="Revocar">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-base text-fg-muted">
          Deja de funcionar de inmediato. No se puede deshacer.
        </p>
        <Button type="button" variant="destructive" onClick={() => setAbierto(true)}>
          Revocar key
        </Button>
      </div>
      <Dialog
        abierto={abierto}
        onCerrar={() => setAbierto(false)}
        titulo={`¿Revocar ${nombre}?`}
        descripcion={error ?? "Todo agente que la use pierde el acceso en el acto."}
        acciones={
          <>
            <Button variant="secondary" onClick={() => setAbierto(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={pendiente}
              onClick={async () => {
                if (!(await ejecutar("core.apikeys.revoke", { apiKeyId: id }))) return;
                avisar.exito("Key revocada");
                router.push("/configuracion/agentes");
              }}
            >
              Revocar
            </Button>
          </>
        }
      />
    </SeccionTarjeta>
  );
}

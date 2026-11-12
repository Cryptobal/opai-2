"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Alerta, Button, Campo, Dialog, Input } from "@opai/ds";

import { accionRenombrarPasskey } from "@/app/_acciones/metodos-acceso";

/** Cambiar el nombre de una passkey (core.metodos_acceso.renombrar_passkey). */
export function RenombrarPasskey({
  id,
  actual,
  onCerrar,
}: {
  id: string;
  actual: string;
  onCerrar: () => void;
}) {
  const router = useRouter();
  const [nombre, setNombre] = useState(actual);
  const [pendiente, setPendiente] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function guardar() {
    setPendiente(true);
    const r = await accionRenombrarPasskey(id, nombre);
    setPendiente(false);
    if (!r.ok) return setError(r.error);
    onCerrar();
    router.refresh();
  }

  return (
    <Dialog
      abierto
      onCerrar={onCerrar}
      titulo="Cambiar nombre"
      acciones={
        <>
          <Button variant="secondary" onClick={onCerrar} disabled={pendiente}>
            Cancelar
          </Button>
          <Button cargando={pendiente} disabled={!nombre.trim()} onClick={() => void guardar()}>
            Guardar
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {error ? (
          <Alerta tono="danger" titulo="No se pudo guardar">
            {error}
          </Alerta>
        ) : null}
        <Campo etiqueta="Nombre" htmlFor="pk-renombrar">
          <Input
            id="pk-renombrar"
            value={nombre}
            maxLength={60}
            onChange={(e) => setNombre(e.target.value)}
            disabled={pendiente}
          />
        </Campo>
      </div>
    </Dialog>
  );
}

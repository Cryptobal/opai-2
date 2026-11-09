"use client";

import { useState } from "react";

import { Alerta, avisar, Button, Dialog } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

/** RR. HH. borra el rostro enrolado (en el proveedor y en OPAI): la persona sigue marcando con RUT y PIN. */
export function BotonBorrarRostro({ personaId, nombre }: { personaId: string; nombre: string }) {
  const { ejecutar, pendiente, error, limpiarError } = useCapacidad("erp");
  const [abierto, setAbierto] = useState(false);
  async function borrar() {
    if (!(await ejecutar("core.biometria.borrar", { personaId }))) return;
    avisar.exito("Rostro borrado. Marca con RUT y PIN.");
    setAbierto(false);
  }
  return (
    <>
      <Button variant="secondary" onClick={() => setAbierto(true)}>Borrar rostro</Button>
      <Dialog
        abierto={abierto}
        onCerrar={() => { setAbierto(false); limpiarError(); }}
        titulo={`Borrar el rostro de ${nombre}`}
        descripcion="Se elimina en el proveedor y en OPAI. No se puede deshacer; debe volver a enrolarse."
        acciones={<><Button variant="secondary" onClick={() => setAbierto(false)}>Cancelar</Button><Button onClick={() => void borrar()} disabled={pendiente}>Borrar</Button></>}
      >
        {error ? <Alerta tono="danger" titulo={error} /> : null}
      </Dialog>
    </>
  );
}

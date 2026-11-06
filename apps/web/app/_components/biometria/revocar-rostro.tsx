"use client";

import { useState } from "react";

import { Alerta, avisar, Button, Dialog } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

/** El trabajador revoca su consentimiento: se borra su rostro y sigue marcando con RUT y PIN (L-14). */
export function RevocarRostro({ portal }: { portal: "terreno" | "trabajador" }) {
  const { ejecutar, pendiente, error, limpiarError } = useCapacidad(portal);
  const [abierto, setAbierto] = useState(false);
  async function revocar() {
    const r = await ejecutar<{ revocado: boolean; biometriaBorrada: boolean }>("asistencia.consentimientos.revocar", { tipo: "biometria_facial" });
    if (!r) return;
    avisar.exito(r.biometriaBorrada ? "Tu rostro se borró. Marca con tu RUT y PIN." : "Revocado. Tu rostro se borrará en las próximas horas; marca con tu PIN.");
    setAbierto(false);
  }
  return (
    <>
      <Button variant="secondary" block onClick={() => setAbierto(true)}>Revocar y borrar mi rostro</Button>
      <Dialog
        abierto={abierto}
        onCerrar={() => { setAbierto(false); limpiarError(); }}
        titulo="¿Borrar tu rostro?"
        descripcion="Se elimina tu rostro del reconocimiento facial. Seguirás marcando con tu RUT y PIN."
        acciones={<>
          <Button variant="secondary" onClick={() => setAbierto(false)}>Cancelar</Button>
          <Button onClick={() => void revocar()} disabled={pendiente}>Revocar y borrar</Button>
        </>}
      >
        {error ? <Alerta tono="danger" titulo={error} /> : null}
      </Dialog>
    </>
  );
}

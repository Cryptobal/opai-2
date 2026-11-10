"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Alerta, avisar, Button, Dialog } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

/** Pide confirmación y descarta un borrador sin folio (CAR-248). Un documento emitido no se descarta. */
export function DescartarBorrador({ documentoId, etiqueta, destino, variante = "secondary" }: { documentoId: string; etiqueta: string; destino?: string; variante?: "secondary" | "ghost" }) {
  const router = useRouter();
  const { ejecutar, pendiente, error, limpiarError } = useCapacidad("erp");
  const [abierto, setAbierto] = useState(false);

  async function descartar() {
    const r = await ejecutar("finanzas.ventas.descartar_borrador", { documentoId });
    if (!r) return;
    avisar.exito("Borrador descartado");
    setAbierto(false);
    if (destino) router.push(destino);
    else router.refresh();
  }
  const cerrar = () => {
    limpiarError();
    setAbierto(false);
  };

  return (
    <>
      <Button variant={variante} onClick={() => setAbierto(true)}>Descartar</Button>
      <Dialog
        abierto={abierto}
        onCerrar={cerrar}
        titulo={`¿Descartar ${etiqueta}?`}
        descripcion="El borrador se borra y no se puede recuperar. No tiene folio ni salió al SII."
        acciones={
          <>
            <Button variant="secondary" onClick={cerrar}>Cancelar</Button>
            <Button disabled={pendiente} onClick={() => void descartar()}>Descartar borrador</Button>
          </>
        }
      >
        {error ? <Alerta tono="danger" titulo="No se pudo descartar">{error}</Alerta> : null}
      </Dialog>
    </>
  );
}

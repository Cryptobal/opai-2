"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Alerta, avisar, Button, Dialog } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

/** Diálogo de confirmación para descartar un borrador sin folio (CAR-248). Un documento emitido no se descarta. */
export function DialogoDescartarBorrador({ documentoId, etiqueta, destino, abierto, onCerrar }: { documentoId: string; etiqueta: string; destino?: string; abierto: boolean; onCerrar: () => void }) {
  const router = useRouter();
  const { ejecutar, pendiente, error, limpiarError } = useCapacidad("erp");

  async function descartar() {
    const r = await ejecutar("finanzas.ventas.descartar_borrador", { documentoId });
    if (!r) return;
    avisar.exito("Borrador descartado");
    onCerrar();
    if (destino) router.push(destino);
    else router.refresh();
  }
  const cerrar = () => {
    limpiarError();
    onCerrar();
  };

  return (
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
  );
}

/** Botón que pide confirmación y descarta un borrador (CAR-248). */
export function DescartarBorrador({ documentoId, etiqueta, destino, variante = "secondary", className }: { documentoId: string; etiqueta: string; destino?: string; variante?: "secondary" | "ghost" | "destructive"; className?: string }) {
  const [abierto, setAbierto] = useState(false);
  return (
    <>
      <Button variant={variante} {...(className ? { className } : {})} onClick={() => setAbierto(true)}>Descartar</Button>
      <DialogoDescartarBorrador documentoId={documentoId} etiqueta={etiqueta} {...(destino ? { destino } : {})} abierto={abierto} onCerrar={() => setAbierto(false)} />
    </>
  );
}

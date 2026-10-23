"use client";

import { useState } from "react";

import { Alerta, Button, Campo, Dialog, Textarea } from "@opai/ds";

type Props = {
  abierto: boolean;
  cantidad: number;
  pendiente: boolean;
  error: string | null;
  onCerrar: () => void;
  onRechazar: (motivo: string) => void;
};

/** Rechazar con motivo (el agente lo recibe al consultar su aprobación). */
export function DialogoRechazar({
  abierto,
  cantidad,
  pendiente,
  error,
  onCerrar,
  onRechazar,
}: Props) {
  const [motivo, setMotivo] = useState("");
  return (
    <Dialog
      abierto={abierto}
      onCerrar={onCerrar}
      titulo={cantidad > 1 ? `Rechazar ${cantidad} acciones` : "Rechazar la acción"}
      descripcion="El agente verá el motivo al consultar su aprobación."
      acciones={
        <>
          <Button variant="secondary" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            disabled={pendiente || motivo.trim().length < 3}
            onClick={() => onRechazar(motivo.trim())}
          >
            Rechazar
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        {error ? <Alerta tono="danger" titulo={error} /> : null}
        <Campo etiqueta="Motivo" htmlFor="rechazo-motivo">
          <Textarea
            id="rechazo-motivo"
            rows={3}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
          />
        </Campo>
      </div>
    </Dialog>
  );
}

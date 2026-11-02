"use client";

import { Button, Campo, Dialog, Textarea } from "@opai/ds";

export function DialogDeshacerBanco({
  abierto,
  pendiente,
  motivo,
  onMotivo,
  onCerrar,
  onConfirmar,
}: {
  abierto: boolean;
  pendiente: boolean;
  motivo: string;
  onMotivo: (v: string) => void;
  onCerrar: () => void;
  onConfirmar: () => void;
}) {
  return (
    <Dialog
      abierto={abierto}
      onCerrar={onCerrar}
      titulo="Deshacer conciliación"
      descripcion="El movimiento volverá a pendiente y se revertirá el cobro en ventas."
      acciones={
        <>
          <Button variant="secondary" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button variant="destructive" disabled={pendiente || motivo.trim().length < 3} onClick={onConfirmar}>
            Deshacer
          </Button>
        </>
      }
    >
      <Campo etiqueta="Motivo" htmlFor="banco-deshacer-motivo">
        <Textarea id="banco-deshacer-motivo" rows={3} value={motivo} onChange={(e) => onMotivo(e.target.value)} />
      </Campo>
    </Dialog>
  );
}

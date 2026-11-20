"use client";

import { Button, Sheet } from "@opai/ds";

type Props = {
  abierto: boolean;
  cantidad: number;
  pendiente: boolean;
  onCerrar: () => void;
  onConfirmar: () => void;
};

export function ConfirmarLoteSheet({ abierto, cantidad, pendiente, onCerrar, onConfirmar }: Props) {
  return (
    <Sheet
      abierto={abierto}
      onCerrar={onCerrar}
      titulo="Confirmar envío masivo"
      acciones={
        <>
          <Button variant="secondary" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button disabled={pendiente} onClick={onConfirmar}>
            Generar y enviar
          </Button>
        </>
      }
    >
      <p className="t-body-sm">
        Vas a generar y enviar a firma {cantidad} documentos. Los errores de una persona no detienen al resto.
      </p>
    </Sheet>
  );
}
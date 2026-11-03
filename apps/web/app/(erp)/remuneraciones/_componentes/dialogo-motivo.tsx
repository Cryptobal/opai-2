"use client";

import { useState } from "react";

import { Alerta, Button, Dialog, Input } from "@opai/ds";

/** Diálogo que pide un motivo (mínimo 5 caracteres) antes de un acto que queda en la auditoría. */
export function DialogoMotivo({ abierto, titulo, descripcion, confirmar, pendiente, error, onCerrar, onConfirmar }: {
  abierto: boolean;
  titulo: string;
  descripcion: string;
  confirmar: string;
  pendiente: boolean;
  error: string | null;
  onCerrar: () => void;
  onConfirmar: (motivo: string) => void;
}) {
  const [motivo, setMotivo] = useState("");
  return (
    <Dialog
      abierto={abierto}
      onCerrar={onCerrar}
      titulo={titulo}
      descripcion={descripcion}
      acciones={
        <Button disabled={pendiente || motivo.trim().length < 5} onClick={() => onConfirmar(motivo.trim())}>
          {confirmar}
        </Button>
      }
    >
      <Input aria-label="Motivo" placeholder="Motivo (mínimo 5 caracteres)" maxLength={300} value={motivo} onChange={(e) => setMotivo(e.target.value)} />
      {error ? <Alerta tono="danger" titulo={error} className="mt-3" /> : null}
    </Dialog>
  );
}

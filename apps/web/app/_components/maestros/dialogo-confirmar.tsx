"use client";

import { useState } from "react";

import { Alerta, Button, Campo, Dialog, Textarea } from "@opai/ds";

export type Confirmacion = {
  titulo: string;
  descripcion: string;
  boton: string;
  peligro?: boolean;
  /** Pide un motivo (mínimo 5 caracteres). */
  motivo?: boolean;
};

type Props = {
  confirmacion: Confirmacion;
  pendiente: boolean;
  error: string | null;
  onCerrar: () => void;
  onConfirmar: (motivo?: string) => void;
};

/** Confirmación de una acción (archivar, terminar, rechazar), con motivo opcional. */
export function DialogoConfirmar({
  confirmacion: c,
  pendiente,
  error,
  onCerrar,
  onConfirmar,
}: Props) {
  const [motivo, setMotivo] = useState("");
  const falta = c.motivo && motivo.trim().length < 5;
  return (
    <Dialog
      abierto
      onCerrar={onCerrar}
      titulo={c.titulo}
      descripcion={c.descripcion}
      acciones={
        <>
          <Button variant="secondary" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button
            variant={c.peligro ? "destructive" : "primary"}
            disabled={pendiente || Boolean(falta)}
            onClick={() => onConfirmar(c.motivo ? motivo.trim() : undefined)}
          >
            {pendiente ? "Procesando…" : c.boton}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        {error ? <Alerta tono="danger" titulo={error} /> : null}
        {c.motivo ? (
          <Campo etiqueta="Motivo" htmlFor="motivo-confirmar" ayuda="Queda en la auditoría.">
            <Textarea
              id="motivo-confirmar"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
            />
          </Campo>
        ) : null}
      </div>
    </Dialog>
  );
}

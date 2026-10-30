"use client";

import { useState } from "react";

import { Alerta, Button, Campo, Dialog, InputFecha, Textarea } from "@opai/ds";

export type Confirmacion = {
  titulo: string;
  descripcion: string;
  boton: string;
  peligro?: boolean;
  /** Pide un motivo (mínimo 5 caracteres). */
  motivo?: boolean;
  motivoEtiqueta?: string;
  motivoPlaceholder?: string;
  /** Pide una fecha obligatoria (p. ej. "Vence el"); va en el input con la clave indicada. */
  fecha?: { etiqueta: string; ayuda?: string; clave: string };
};

type Props = {
  confirmacion: Confirmacion;
  pendiente: boolean;
  error: string | null;
  onCerrar: () => void;
  onConfirmar: (motivo?: string, fecha?: string) => void;
};

/** Confirmación de una acción (archivar, terminar, rechazar), con motivo y fecha opcionales. */
export function DialogoConfirmar({
  confirmacion: c,
  pendiente,
  error,
  onCerrar,
  onConfirmar,
}: Props) {
  const [motivo, setMotivo] = useState("");
  const [fecha, setFecha] = useState("");
  const faltaMotivo = c.motivo && motivo.trim().length < 5;
  const faltaFecha = c.fecha && !fecha;
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
            disabled={pendiente || Boolean(faltaMotivo) || Boolean(faltaFecha)}
            onClick={() =>
              onConfirmar(c.motivo ? motivo.trim() : undefined, c.fecha ? fecha : undefined)
            }
          >
            {pendiente ? "Procesando…" : c.boton}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        {error ? <Alerta tono="danger" titulo={error} /> : null}
        {c.fecha ? (
          <Campo
            etiqueta={c.fecha.etiqueta}
            htmlFor="fecha-confirmar"
            {...(c.fecha.ayuda ? { ayuda: c.fecha.ayuda } : {})}
          >
            <InputFecha id="fecha-confirmar" valor={fecha} onCambiar={setFecha} />
          </Campo>
        ) : null}
        {c.motivo ? (
          <Campo
            etiqueta={c.motivoEtiqueta ?? "Motivo"}
            htmlFor="motivo-confirmar"
            ayuda="Queda en la auditoría."
          >
            <Textarea
              id="motivo-confirmar"
              value={motivo}
              placeholder={c.motivoPlaceholder}
              onChange={(e) => setMotivo(e.target.value)}
            />
          </Campo>
        ) : null}
      </div>
    </Dialog>
  );
}

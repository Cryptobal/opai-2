"use client";

import { useState } from "react";

import { Alerta, Button, Campo, Dialog, Textarea } from "@opai/ds";

export function DialogoRechazarAprobacion({
  abierto,
  pendiente,
  error,
  onCerrar,
  onConfirmar,
}: {
  abierto: boolean;
  pendiente: boolean;
  error: string | null;
  onCerrar: () => void;
  onConfirmar: (motivo: string) => void;
}) {
  const [motivo, setMotivo] = useState("");

  return (
    <Dialog abierto={abierto} titulo="Rechazar aprobación de margen" onCerrar={onCerrar}>
      <div className="space-y-4 p-1">
        <p className="t-body-sm text-fg-muted">Indica el motivo; la cotización vuelve a borrador.</p>
        <Campo etiqueta="Motivo" htmlFor="cpq-rechazo-motivo">
          <Textarea
            id="cpq-rechazo-motivo"
            rows={3}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
          />
        </Campo>
        {error ? <Alerta tono="danger" titulo={error} /> : null}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={pendiente || motivo.trim().length < 3}
            onClick={() => onConfirmar(motivo.trim())}
          >
            Rechazar
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

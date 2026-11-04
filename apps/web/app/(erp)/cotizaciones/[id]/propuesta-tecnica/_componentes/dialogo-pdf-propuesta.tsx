"use client";

import { useEffect } from "react";

import { Button, Dialog } from "@opai/ds";

/** Vista previa del PDF de la propuesta técnica: iframe sobre una URL `blob:` (la CSP bloquea `data:`). */
export function DialogoPdfPropuesta({
  codigo,
  pdfUrl,
  borrador,
  onCerrar,
}: {
  codigo: string;
  pdfUrl: string;
  borrador: boolean;
  onCerrar: () => void;
}) {
  // La URL `blob:` se libera al cerrar.
  useEffect(() => () => URL.revokeObjectURL(pdfUrl), [pdfUrl]);
  return (
    <Dialog abierto titulo={`Vista previa · Propuesta técnica ${codigo}`} onCerrar={onCerrar} tamano="grande">
      <div className="space-y-3 p-1">
        <p className="t-caption text-fg-muted">
          {borrador ? "Marca de agua BORRADOR hasta que se envíe" : "Sin marca de agua"}
        </p>
        <iframe
          title="Vista previa de la propuesta técnica"
          src={pdfUrl}
          className="h-[70vh] w-full rounded-md border border-border"
        />
        <div className="flex justify-end">
          <Button type="button" variant="secondary" onClick={onCerrar}>
            Cerrar
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

"use client";

import { useEffect } from "react";

import { Dialog } from "@opai/ds";

import { VisorPdf } from "@/app/_components/visor-pdf";

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
      <div className="min-w-0 max-w-full space-y-3 p-3">
        <p className="t-caption text-fg-muted">
          {borrador ? "Marca de agua BORRADOR hasta que se envíe" : "Sin marca de agua"}
        </p>
        <VisorPdf
          pdfUrl={pdfUrl}
          titulo="Vista previa de la propuesta técnica"
          nombreArchivo={`${codigo}-propuesta-tecnica.pdf`}
          onCerrar={onCerrar}
        />
      </div>
    </Dialog>
  );
}

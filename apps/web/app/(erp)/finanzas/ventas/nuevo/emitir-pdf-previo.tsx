"use client";

import { useEffect, useState } from "react";

import { Button, Card, Dialog } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";
import { VisorPdf } from "@/app/_components/visor-pdf";

/** Vista previa en PDF del borrador guardado: marca «BORRADOR», sin folio ni timbre ni valor tributario. */
export function EmitirPdfPrevio({ documentoId }: { documentoId: string }) {
  const { ejecutar, pendiente } = useCapacidad("erp");
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => () => (url ? URL.revokeObjectURL(url) : undefined), [url]);

  async function abrir() {
    const r = await ejecutar<{ base64: string }>("finanzas.ventas.preview_pdf", { documentoId }, false, "ninguna");
    if (!r) return;
    const bytes = Uint8Array.from(atob(r.base64), (c) => c.charCodeAt(0));
    setUrl(URL.createObjectURL(new Blob([bytes], { type: "application/pdf" })));
  }

  return (
    <Card className="flex flex-col gap-3 p-4">
      <h2 className="t-label text-fg">Vista previa del documento</h2>
      <p className="text-sm text-fg-muted">Así quedará el documento. Es solo una vista previa: no tiene folio ni valor tributario.</p>
      <div>
        <Button variant="secondary" disabled={pendiente} onClick={() => void abrir()}>
          Ver PDF del borrador
        </Button>
      </div>
      <Dialog abierto={url !== null} onCerrar={() => setUrl(null)} titulo="Borrador del documento" tamano="grande">
        {url ? (
          <VisorPdf pdfUrl={url} titulo="Vista previa del borrador en PDF" nombreArchivo="borrador.pdf" alto="h-[75dvh]" onCerrar={() => setUrl(null)} />
        ) : null}
      </Dialog>
    </Card>
  );
}

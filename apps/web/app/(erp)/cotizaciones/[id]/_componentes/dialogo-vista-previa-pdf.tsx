"use client";

import { Download } from "lucide-react";
import { useEffect, useState } from "react";

import { Alerta, Button, Dialog } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

export function DialogoVistaPreviaPdf({
  cotizacionId,
  codigo,
  version,
  enviada,
  onCerrar,
}: {
  cotizacionId: string;
  codigo: string;
  version: number;
  enviada: boolean;
  onCerrar: () => void;
}) {
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [paginas, setPaginas] = useState<number | null>(null);

  useEffect(() => {
    let activo = true;
    void ejecutar("cpq.cotizaciones.preview_pdf", { id: cotizacionId }, true).then((r) => {
      if (!activo) return;
      if (r && typeof r === "object" && "pdfBase64" in r) {
        const data = r as { pdfBase64: string; bytes?: number };
        setPdfUrl(`data:application/pdf;base64,${data.pdfBase64}`);
        setPaginas(data.bytes ? Math.max(1, Math.round(data.bytes / 12_000)) : null);
      }
    });
    return () => {
      activo = false;
    };
  }, [cotizacionId, ejecutar]);

  return (
    <Dialog abierto titulo={`Vista previa · ${codigo} v${version}`} onCerrar={onCerrar} tamano="grande">
      <div className="space-y-3 p-1">
        <p className="t-caption text-fg-muted">
          {paginas ? `${paginas} páginas A4 · ` : null}
          {!enviada ? "Marca de agua BORRADOR hasta que se envíe" : "Sin marca de agua"}
        </p>
        {error ? <Alerta tono="danger" titulo={error} /> : null}
        {pdfUrl ? (
          <iframe title="Vista previa PDF" src={pdfUrl} className="h-[70vh] w-full rounded-md border border-border" />
        ) : (
          <p className="t-body-sm text-fg-muted">{pendiente ? "Generando PDF…" : "Sin vista previa"}</p>
        )}
        <div className="flex justify-end gap-2">
          {pdfUrl ? (
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                const a = document.createElement("a");
                a.href = pdfUrl;
                a.download = `${codigo}-v${version}.pdf`;
                a.click();
              }}
            >
              <Download className="size-4" aria-hidden />
              Descargar PDF
            </Button>
          ) : null}
          <Button type="button" variant="secondary" onClick={onCerrar}>
            Cerrar
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

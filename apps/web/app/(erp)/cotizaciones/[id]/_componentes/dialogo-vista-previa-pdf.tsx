"use client";

import { Download } from "lucide-react";

import { Alerta, Button, Dialog } from "@opai/ds";

import { useVistaPreviaPdf } from "./use-vista-previa-pdf";

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
  const { estado, mensaje, reintentar } = useVistaPreviaPdf(cotizacionId);
  const pdfUrl = estado.fase === "listo" ? estado.pdfUrl : null;
  const paginas = estado.fase === "listo" ? estado.paginas : null;

  return (
    <Dialog abierto titulo={`Vista previa · ${codigo} v${version}`} onCerrar={onCerrar} tamano="grande">
      <div className="space-y-3 p-1">
        <p className="t-caption text-fg-muted">
          {paginas ? `${paginas} páginas A4 · ` : null}
          {!enviada ? "Marca de agua BORRADOR hasta que se envíe" : "Sin marca de agua"}
        </p>
        {mensaje ? (
          <Alerta
            tono="danger"
            titulo="No se pudo mostrar la vista previa"
            accion={
              <Button type="button" variant="secondary" size="md" onClick={reintentar}>
                Reintentar
              </Button>
            }
          >
            {mensaje}
          </Alerta>
        ) : null}
        {pdfUrl ? (
          <iframe title="Vista previa PDF" src={pdfUrl} className="h-[70vh] w-full rounded-md border border-border" />
        ) : estado.fase === "generando" ? (
          <p role="status" className="t-body-sm text-fg-muted">
            Generando PDF…
          </p>
        ) : null}
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

"use client";

import { Alerta, Button, Dialog } from "@opai/ds";

import { VisorPdf } from "@/app/_components/visor-pdf";

import { textoPaginas, useVistaPreviaPdf } from "./use-vista-previa-pdf";

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
      <div className="min-w-0 max-w-full space-y-3 p-3">
        <p className="t-caption text-fg-muted">
          {paginas ? `${textoPaginas(paginas)} · ` : null}
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
          <VisorPdf
            pdfUrl={pdfUrl}
            titulo="Vista previa PDF"
            nombreArchivo={`${codigo}-v${version}.pdf`}
            onCerrar={onCerrar}
          />
        ) : (
          <>
            {estado.fase === "generando" ? (
              <p role="status" className="t-body-sm text-fg-muted">
                Generando PDF…
              </p>
            ) : null}
            <Button type="button" variant="secondary" onClick={onCerrar}>
              Cerrar
            </Button>
          </>
        )}
      </div>
    </Dialog>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Alerta, Button } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";
import { VisorPdf } from "@/app/_components/visor-pdf";
import { VistaHtml } from "@/app/(erp)/configuracion/_cpq/revision-plantilla-html";

import { urlDePdf } from "../../_componentes/use-vista-previa-pdf";

type Documento = { html: string | null; nombre: string | null; version: number | null };

/** La propuesta como documento: la plantilla HTML con la marca, o el PDF de la marca si no hay plantilla. */
export function VistaDocumentoPropuesta({
  id,
  cotizacionId,
}: {
  id: string;
  cotizacionId: string;
}) {
  const { ejecutar, error } = useCapacidad("erp");
  const [html, setHtml] = useState<Documento | null>(null);
  const [pdf, setPdf] = useState<string | null>(null);
  const [fallo, setFallo] = useState(false);
  const [intento, setIntento] = useState(0);
  const url = useRef<string | null>(null);
  const liberar = useCallback(() => {
    if (url.current) URL.revokeObjectURL(url.current);
    url.current = null;
  }, []);

  useEffect(() => {
    let activo = true;
    void cargar(ejecutar, id, cotizacionId).then((r) => {
      if (!r) return setFallo(true);
      if (!activo) {
        if (r.pdf) URL.revokeObjectURL(r.pdf);
        return;
      }
      setFallo(false);
      setHtml(r.doc);
      liberar();
      url.current = r.pdf;
      setPdf(r.pdf);
    });
    return () => {
      activo = false;
    };
  }, [cotizacionId, ejecutar, id, intento, liberar]);
  useEffect(() => liberar, [liberar]);

  return (
    <section aria-label="Documento de la propuesta" className="space-y-2">
      <p className="t-label">Documento</p>
      <PieDocumento html={html} />
      {fallo && error ? (
        <Alerta
          tono="danger"
          titulo="No se pudo mostrar el documento"
          accion={
            <Button type="button" variant="secondary" onClick={() => setIntento((n) => n + 1)}>
              Reintentar
            </Button>
          }
        >
          {error}
        </Alerta>
      ) : html?.html ? (
        <div className="mx-auto max-w-3xl overflow-hidden rounded-md border border-border bg-white shadow-sm">
          <VistaHtml html={html.html} titulo="Documento de la propuesta" alto="h-[75vh]" />
        </div>
      ) : pdf ? (
        <VisorPdf
          pdfUrl={pdf}
          titulo="Documento de la propuesta"
          nombreArchivo="propuesta-tecnica.pdf"
          alto="h-[75vh]"
        />
      ) : (
        <p role="status" className="t-body-sm text-fg-muted">
          Generando el documento…
        </p>
      )}
    </section>
  );
}

function PieDocumento({ html }: { html: Documento | null }) {
  if (!html) return null;
  const texto = html.html
    ? `Plantilla «${html.nombre ?? "HTML"}» v${html.version}, con la marca de la empresa y los datos de la cotización.`
    : "Sin plantilla HTML en uso: el documento usa el formato de la empresa, con su marca.";
  return <p className="t-caption text-fg-muted">{texto}</p>;
}

async function cargar(
  ejecutar: ReturnType<typeof useCapacidad>["ejecutar"],
  id: string,
  cotizacionId: string,
): Promise<{ doc: Documento; pdf: string | null } | null> {
  const doc = await ejecutar<Documento>(
    "cpq.propuestas_tecnica.vista_html",
    { id, cotizacionId },
    false,
    "ninguna",
  );
  if (!doc) return null;
  if (doc.html) return { doc, pdf: null };
  const pdf = await ejecutar<{ pdfBase64: string }>(
    "cpq.propuestas_tecnica.preview_pdf",
    { id, cotizacionId },
    true,
    "ninguna",
  );
  return pdf ? { doc, pdf: urlDePdf(pdf.pdfBase64) } : null;
}

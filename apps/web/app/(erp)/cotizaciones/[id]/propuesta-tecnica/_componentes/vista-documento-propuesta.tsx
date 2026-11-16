"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Alerta, Button } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";
import { VisorPdf } from "@/app/_components/visor-pdf";

import { urlDePdf } from "../../_componentes/use-vista-previa-pdf";

/** El mismo documento que se envía: plantilla en uso (o la base de OPAI), con membrete, logo y secciones. */
export function VistaDocumentoPropuesta({
  id,
  cotizacionId,
}: {
  id: string;
  cotizacionId: string;
}) {
  const { ejecutar, error } = useCapacidad("erp");
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
    void ejecutar<{ pdfBase64: string }>(
      "cpq.propuestas_tecnica.preview_pdf",
      { id, cotizacionId },
      true,
      "ninguna",
    ).then((r) => {
      if (!r) return setFallo(true);
      if (!activo) return;
      setFallo(false);
      liberar();
      url.current = urlDePdf(r.pdfBase64);
      setPdf(url.current);
    });
    return () => {
      activo = false;
    };
  }, [cotizacionId, ejecutar, id, intento, liberar]);
  useEffect(() => liberar, [liberar]);

  return (
    <section aria-label="Documento de la propuesta" className="space-y-2">
      <p className="t-label">Documento</p>
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
